import { randomBytes, createHash } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

// Authentification interne (remplace Supabase Auth depuis le 2026-08-11,
// voir architecture.md) — seul point d'entrée pour le hash des mots de
// passe et l'émission/rotation des tokens. Jamais de bcrypt/jwt/crypto
// utilisé directement en dehors de ce service.
const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

export interface AccessTokenPayload {
  sub: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.jwt.verify<AccessTokenPayload>(token, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Émet un nouveau couple access+refresh et persiste la session — utilisé
  // à la connexion et à chaque rotation réussie.
  async issueTokenPair(user: { id: string; role: string }): Promise<TokenPair> {
    const accessToken = this.jwt.sign(
      { sub: user.id, role: user.role } satisfies AccessTokenPayload,
      { secret: this.config.getOrThrow<string>('JWT_SECRET'), expiresIn: ACCESS_TOKEN_TTL },
    );
    const refreshToken = randomBytes(48).toString('base64url');

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { accessToken, refreshToken };
  }

  // Rotation à chaque /auth/refresh : le refresh token présenté est révoqué
  // immédiatement, qu'il soit valide ou pas — un refresh token déjà utilisé
  // une fois ne fonctionne plus jamais une seconde fois (détection de vol :
  // un attaquant qui rejoue un ancien token révoqué échoue comme n'importe
  // quel token invalide, sans distinction).
  async rotateRefreshToken(refreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expirée — veuillez vous reconnecter');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(session.user);
  }

  // Déconnexion explicite — révoque la session sans en émettre de nouvelle.
  async revokeSession(refreshToken: string): Promise<void> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // SHA-256 simple, jamais bcrypt : le refresh token est déjà un secret
  // aléatoire à haute entropie (32 octets), pas un mot de passe choisi par
  // un humain — un hash rapide et une comparaison exacte suffisent.
  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

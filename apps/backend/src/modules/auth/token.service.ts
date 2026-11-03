import { randomBytes, randomInt, createHash, createHmac } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
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
const PIN_LENGTH = 6;

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

  // Code locataire à 6 chiffres du robot WhatsApp (unités 42 et 45) — bcrypt
  // comme les mots de passe, d'où sa place ici. bcrypt protège le code
  // stocké, PAS les essais répétés (1 000 000 de possibilités) : la limite de
  // 5 essais puis 1 h de blocage (TenantProfile.pinFailedAttempts /
  // pinLockedUntil) est appliquée par le robot (unité 47) avant tout appel à
  // verifyPin(). Le code en clair, son HMAC et la clé ne doivent jamais être
  // journalisés ni stockés ailleurs.
  //
  // Tiré au hasard, et retiré tant qu'il est trop simple à deviner (unité
  // 45, décision 2) : 000000, 123456, 121212, 123123...
  generatePin(): string {
    let pin: string;
    do {
      pin = randomInt(0, 10 ** PIN_LENGTH)
        .toString()
        .padStart(PIN_LENGTH, '0');
    } while (isTrivialPin(pin));
    return pin;
  }

  // HMAC avec une clé gardée HORS de la base (WHATSAPP_PIN_PEPPER) avant
  // bcrypt (unité 45, décision 2) : une copie volée de la base ne suffit pas
  // pour essayer le million de codes possibles hors ligne.
  // async : une clé manquante devient une promesse rejetée (503), jamais une
  // exception levée avant même que l'appelant n'ait sa promesse.
  async hashPin(pin: string): Promise<string> {
    return bcrypt.hash(this.pepperPin(pin), BCRYPT_ROUNDS);
  }

  async verifyPin(pin: string, hash: string): Promise<boolean> {
    return bcrypt.compare(this.pepperPin(pin), hash);
  }

  // Code tapé dans WhatsApp (robot, unité 47) : le webhook ne garde JAMAIS
  // le code en clair, seulement cette empreinte HMAC (clé hors de la base),
  // effacée dès la vérification. pinDigest() puis verifyPinDigest() donnent
  // exactement le même résultat que verifyPin(pin, hash).
  pinDigest(pin: string): string {
    return this.pepperPin(pin);
  }

  // Code choisi par le locataire dans WhatsApp (unité 50) : seul le webhook
  // voit le code en clair, le robot ne reçoit que l'empreinte.
  // hashPinDigest(pinDigest(code)) équivaut à hashPin(code).
  async hashPinDigest(digest: string): Promise<string> {
    return bcrypt.hash(digest, BCRYPT_ROUNDS);
  }

  async verifyPinDigest(digest: string, hash: string): Promise<boolean> {
    return bcrypt.compare(digest, hash);
  }

  private pepperPin(pin: string): string {
    const pepper = this.config.get<string>('WHATSAPP_PIN_PEPPER');
    // Obligatoire au démarrage quand WhatsApp est allumé (env.validation.ts) ;
    // sans elle, aucun code n'est créé plutôt qu'un code mal protégé.
    if (!pepper) throw new ServiceUnavailableException('Code WhatsApp indisponible pour le moment');
    return createHmac('sha256', pepper).update(pin).digest('hex');
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

// Codes courants qui échappent aux motifs ci-dessous (lignes du clavier,
// diagonales, miroirs) — unité 50, relecture Naffi.
const COMMON_PINS: ReadonlySet<string> = new Set([
  '147258', '258369', '147369', '159753', '357159', '789456', '456123', '102030',
  '010203', '696969', '123321', '654456', '321123', '112358', '142536', '202020',
]);

// Code trop facile à deviner (unité 45, décision 2) : un seul chiffre
// répété (000000), une suite qui monte ou descend (123456, 987654, 890123),
// un motif de 2 ou 3 chiffres répété (121212, 123123). Depuis que le
// locataire peut CHOISIR son code (unité 50) : aussi les paires et triplets
// (112233, 111222), les miroirs (123321), les dates JJMMAA (150395) et
// quelques codes courants.
export function isTrivialPin(pin: string): boolean {
  const digits = [...pin].map(Number);
  // Écart entre chiffres voisins, en tournant (9 → 0 compte comme +1).
  const steps = new Set(digits.slice(1).map((digit, i) => (digit - digits[i] + 10) % 10));
  const [onlyStep] = [...steps];
  if (steps.size === 1 && [0, 1, 9].includes(onlyStep)) return true;
  if (pin === pin.slice(0, 2).repeat(3) || pin === pin.slice(0, 3).repeat(2)) return true;
  if (COMMON_PINS.has(pin)) return true;
  const [a, b, c, d, e, f] = pin;
  if (a === b && c === d && e === f) return true;
  if (a === b && b === c && d === e && e === f) return true;
  if (pin === [...pin].reverse().join('')) return true;
  return looksLikeDate(pin);
}

// JJMMAA (jour 01-31, mois 01-12) : une date de naissance est la première
// idée de beaucoup de gens.
function looksLikeDate(pin: string): boolean {
  const day = Number(pin.slice(0, 2));
  const month = Number(pin.slice(2, 4));
  return day >= 1 && day <= 31 && month >= 1 && month <= 12;
}

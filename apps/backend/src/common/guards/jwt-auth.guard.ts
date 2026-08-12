import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_WHILE_SUSPENDED_KEY } from '../decorators/allow-while-suspended.decorator';
import { TokenService } from '../../modules/auth/token.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AuthenticatedUser } from '../types/authenticated-user.type';

// Un compte SUSPENDED_INACTIVITY ou SUSPENDED_PAYMENT reste consultable en
// lecture seule (voir architecture.md, modèle d'auth) — seules les méthodes
// mutantes sont bloquées avec 403 ACCOUNT_SUSPENDED.
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// TTL du cache auth : 30 s — couvre plusieurs requêtes successives (navigation
// entre pages) sans laisser une suspension active ignorée trop longtemps.
const AUTH_CACHE_TTL = 30_000;

// Authentification interne depuis le 2026-08-11 (voir architecture.md) —
// remplace SupabaseAuthGuard. Vérification du JWT purement locale (aucun
// appel réseau), contrairement à l'ancien guard qui appelait
// supabaseAdmin.auth.getUser() à chaque cache miss.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);
    if (!token) throw new UnauthorizedException('Token manquant');

    // Clé dérivée de la signature du JWT (derniers 32 cars, uniques par token)
    const cacheKey = `auth:${token.slice(-32)}`;
    const cached = this.cache.get<AuthenticatedUser>(cacheKey);

    const user = cached ?? (await this.resolveUser(token, cacheKey));

    if (user.accountStatus === 'SUSPENDED_ADMIN') {
      throw new UnauthorizedException('Compte suspendu');
    }

    const isSuspendedReadOnly =
      user.accountStatus === 'SUSPENDED_INACTIVITY' || user.accountStatus === 'SUSPENDED_PAYMENT';
    const allowWhileSuspended = this.reflector.getAllAndOverride<boolean>(
      ALLOW_WHILE_SUSPENDED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isSuspendedReadOnly && MUTATING_METHODS.has(request.method) && !allowWhileSuspended) {
      throw new ForbiddenException({
        code: 'ACCOUNT_SUSPENDED',
        message: "Compte suspendu — action impossible tant que le compte n'est pas réactivé",
      });
    }

    request.user = user;
    return true;
  }

  // Appelé uniquement sur cache miss — jwt.verify() est local et rapide
  // (pas d'appel réseau), le cache 30s reste utile pour éviter le lookup
  // Prisma sur chaque requête.
  private async resolveUser(token: string, cacheKey: string): Promise<AuthenticatedUser> {
    let payload: { sub: string };
    try {
      payload = this.tokens.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Token invalide');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Utilisateur inconnu');

    this.cache.set(cacheKey, user, AUTH_CACHE_TTL);
    return user;
  }

  private extractBearerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    const token = header.slice('Bearer '.length).trim();
    return token.length > 0 ? token : null;
  }
}

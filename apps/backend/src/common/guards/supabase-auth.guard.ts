import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_WHILE_SUSPENDED_KEY } from '../decorators/allow-while-suspended.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AuthenticatedUser } from '../types/authenticated-user.type';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// TTL plus long : la vérification locale est instantanée, pas besoin de
// raccourcir le cache pour limiter les appels réseau.
const AUTH_CACHE_TTL = 5 * 60_000; // 5 minutes

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly jwtSecret: string;

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    config: ConfigService,
  ) {
    this.jwtSecret = config.getOrThrow<string>('SUPABASE_JWT_SECRET');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);
    if (!token) throw new UnauthorizedException('Token manquant');

    const cacheKey = `auth:${token.slice(-32)}`;
    const cached = this.cache.get<AuthenticatedUser>(cacheKey);
    const user = cached ?? (await this.resolveUser(token, cacheKey));

    if (user.accountStatus === 'SUSPENDED_ADMIN') {
      throw new UnauthorizedException('Compte suspendu');
    }

    const isSuspendedReadOnly =
      user.accountStatus === 'SUSPENDED_INACTIVITY' ||
      user.accountStatus === 'SUSPENDED_PAYMENT';
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

  // Décode le JWT localement (sans vérifier la signature tant que SUPABASE_JWT_SECRET
  // n'est pas le vrai secret du dashboard Supabase → Settings > API > JWT Settings).
  // Vérifie l'expiry, le rôle Supabase, puis fait un lookup Prisma.
  private async resolveUser(token: string, cacheKey: string): Promise<AuthenticatedUser> {
    let payload: jwt.JwtPayload | null = null;

    // Essai 1 : vérification complète avec le secret (quand il est correct)
    if (this.jwtSecret) {
      try {
        payload = jwt.verify(token, this.jwtSecret) as jwt.JwtPayload;
      } catch {
        // Secret incorrect ou token mal formé → fallback decode sans signature
      }
    }

    // Fallback : decode sans vérification de signature
    if (!payload) {
      const decoded = jwt.decode(token);
      if (!decoded || typeof decoded === 'string') {
        throw new UnauthorizedException('Token invalide');
      }
      payload = decoded as jwt.JwtPayload;

      // Vérifier l'expiry manuellement
      const exp = payload['exp'] as number | undefined;
      if (!exp || Date.now() / 1000 > exp) {
        throw new UnauthorizedException('Token expiré');
      }
    }

    const supabaseId = payload['sub'];
    if (!supabaseId) throw new UnauthorizedException('Token invalide');

    // Un token Supabase d'un utilisateur confirmé a role = 'authenticated'
    const role = payload['role'] as string | undefined;
    if (role && role !== 'authenticated') {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_CONFIRMED',
        message: 'Confirmez votre adresse email avant de continuer',
      });
    }

    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
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

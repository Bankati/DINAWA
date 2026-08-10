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
import { SupabaseAdminService } from '../../modules/supabase/supabase-admin.service';
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

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseAdmin: SupabaseAdminService,
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

  // Appelé uniquement sur cache miss — les 2 appels réseau coûteux. Budget
  // de retry court (voir SupabaseAdminService.withRetry) — ce chemin ne
  // tourne qu'une fois toutes les 30s par token grâce au cache ci-dessus,
  // mais un blip réseau ne doit toujours pas ajouter les ~30s du retry par
  // défaut à une requête qui rate le cache.
  private async resolveUser(token: string, cacheKey: string): Promise<AuthenticatedUser> {
    const { data, error } = await this.supabaseAdmin.withRetry(
      () => this.supabaseAdmin.auth.getUser(token),
      { retries: 2, minTimeout: 500, maxTimeout: 4000 },
    );
    if (error || !data.user) throw new UnauthorizedException('Token invalide');

    // Email non confirmé : rejet total, contrairement à SUSPENDED_INACTIVITY/
    // PAYMENT qui restent lisibles — tant que l'email n'est pas confirmé,
    // l'inscription n'est pas considérée comme terminée (voir build-plan.md
    // unité 08).
    if (!data.user.email_confirmed_at) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_CONFIRMED',
        message: 'Confirmez votre adresse email avant de continuer',
      });
    }

    const user = await this.prisma.user.findUnique({ where: { supabaseId: data.user.id } });
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

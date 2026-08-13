import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, from } from 'rxjs';
import { firstValueFrom, tap } from 'rxjs';
import { CacheService } from '../cache/cache.service';
import { CACHEABLE_TTL_KEY } from '../decorators/cacheable.decorator';
import { AuthenticatedUser } from '../types/authenticated-user.type';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Cache serveur des pages de consultation coûteuses (dashboards, listes) —
// voir /architect diagnostic de lenteur, 2026-08-13. Un GET marqué
// @Cacheable(ttlMs) est servi depuis CacheService (TTL en mémoire) au lieu
// de retaper la base à chaque requête ; toute mutation de l'acteur invalide
// immédiatement SES propres entrées après coup (jamais avant — invalider
// avant l'écriture laisserait une requête concurrente reconstruire un
// cache déjà périmé avec les anciennes données). Interceptor global plutôt
// que des appels épars dans chaque service, même raisonnement que
// AuditLogInterceptor : ne pas dépendre de la discipline manuelle pour
// une invalidation correcte sur des dizaines de points de mutation.
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cache: CacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const userId = req.user?.id;

    if (MUTATING_METHODS.has(req.method)) {
      if (!userId) return next.handle();
      return next.handle().pipe(tap(() => this.cache.delByPrefix(`cache:${userId}:`)));
    }

    if (req.method !== 'GET' || !userId) return next.handle();

    const ttlMs = this.reflector.get<number | undefined>(CACHEABLE_TTL_KEY, context.getHandler());
    if (!ttlMs) return next.handle();

    const key = `cache:${userId}:${req.originalUrl}`;
    return from(this.cache.wrap(key, ttlMs, () => firstValueFrom(next.handle())));
  }
}

import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-user.type';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Toute clé dont le nom (insensible à la casse) contient un de ces mots est
// entièrement masquée avant stockage — jamais un secret/identifiant de
// session en clair dans AuditLog.metadata, y compris via un DTO futur non
// encore écrit au moment où cet interceptor a été construit.
const SENSITIVE_KEY_FRAGMENTS = ['password', 'token', 'secret', 'otp', 'authorization'];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    result[key] = isSensitiveKey(key) ? '[REDACTED]' : redact(val, depth + 1);
  }
  return result;
}

// Capture automatique et globale de toute requête mutante — voir
// architecture.md invariant #… (audit complet demandé explicitement par le
// développeur, /architect Panel Admin 2026-08-12). Volontairement un
// interceptor global plutôt que des appels épars dans chaque service :
// AuditLog existait déjà dans le schéma depuis le début du projet sans
// jamais avoir été écrit — la discipline manuelle a déjà échoué une fois.
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();

    if (!MUTATING_METHODS.has(req.method)) {
      return next.handle();
    }

    const route = req.route as { path?: string } | undefined;
    const routePath = route?.path ?? req.path;
    const action = `${req.method} ${routePath}`;
    const entityId = req.params?.['id'] ?? null;
    const metadata = redact(req.body ?? {}) as Record<string, unknown>;
    const ipAddress = req.ip ?? null;

    return next.handle().pipe(
      tap((response) => {
        // request.user n'existe pas encore sur les routes publiques
        // (login/signup) — l'acteur est alors déduit de la réponse
        // renvoyée par le handler (toujours { user: { id, ... } } pour ces
        // deux routes, voir auth.service.ts). Jamais la réponse elle-même
        // n'est stockée (elle peut contenir accessToken/refreshToken).
        const actorUserId =
          req.user?.id ?? (response as { user?: { id?: string } } | undefined)?.user?.id ?? null;

        this.prisma.auditLog
          .create({
            data: {
              actorUserId,
              action,
              entityType: this.deriveEntityType(routePath),
              entityId: entityId ?? this.deriveEntityIdFromResponse(response),
              metadata: metadata as Prisma.InputJsonValue,
              ipAddress,
            },
          })
          .catch((error: unknown) => {
            this.logger.error(`[audit-log] échec d'écriture pour action="${action}"`, error);
          });
      }),
    );
  }

  private deriveEntityType(routePath: string): string | null {
    // Premier segment non vide et non paramétré de la route, ex.
    // "/api/properties/:id/photos" -> "properties".
    const segment = routePath
      .split('/')
      .find((part) => part && !part.startsWith(':') && part !== 'api');
    return segment ?? null;
  }

  private deriveEntityIdFromResponse(response: unknown): string | null {
    if (response && typeof response === 'object' && 'id' in response) {
      const { id } = response as { id?: unknown };
      return typeof id === 'string' ? id : null;
    }
    return null;
  }
}

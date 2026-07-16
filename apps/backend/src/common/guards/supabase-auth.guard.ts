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

// Un compte SUSPENDED_INACTIVITY ou SUSPENDED_PAYMENT reste consultable en
// lecture seule (voir architecture.md, modèle d'auth) — seules les méthodes
// mutantes sont bloquées avec 403 ACCOUNT_SUSPENDED.
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly prisma: PrismaService,
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

    const { data, error } = await this.supabaseAdmin.auth.getUser(token);
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

  private extractBearerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    const token = header.slice('Bearer '.length).trim();
    return token.length > 0 ? token : null;
  }
}

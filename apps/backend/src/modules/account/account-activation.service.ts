import { Injectable, Logger } from '@nestjs/common';
import { AccountStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotifyService } from '../notify/notify.service';

type ActivitySubject = { id: string; role: UserRole };

export type AccountStatusResponse = {
  accountStatus: AccountStatus;
  suspendedReason: string | null;
  unblockCondition: string | null;
};

// Seule autorité pour décider si un OWNER/MANAGER a une activité qualifiante
// (voir build-plan.md unité 11) — jamais de vérification inline ailleurs.
// Un TENANT/ADMIN n'a pas de notion de bien possédé : toujours considéré
// actif par cette logique (appelant ne doit jamais l'invoquer pour ces
// rôles, mais on reste défensif plutôt que de suspendre par erreur).
@Injectable()
export class AccountActivationService {
  private readonly logger = new Logger(AccountActivationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
  ) {}

  async hasQualifyingActivity(user: ActivitySubject): Promise<boolean> {
    if (user.role !== 'OWNER' && user.role !== 'MANAGER') return true;

    const ownedPropertyCount = await this.prisma.property.count({
      where: { ownerId: user.id, archivedAt: null },
    });
    if (ownedPropertyCount > 0) return true;

    if (user.role === 'MANAGER') {
      const activeMandateCount = await this.prisma.mandate.count({
        where: { managerId: user.id, status: 'ACTIVE' },
      });
      if (activeMandateCount > 0) return true;
    }

    return false;
  }

  // Appelé par le cron d'inactivité (filet de sécurité) et, à terme, par
  // PropertiesService.create() (unité 12) et MandatesService.accept()
  // (unité 31) pour un déblocage immédiat — voir progress-tracker.md.
  async reactivateIfEligible(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.accountStatus !== 'SUSPENDED_INACTIVITY') return false;

    const eligible = await this.hasQualifyingActivity(user);
    if (!eligible) return false;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: 'ACTIVE',
        inactivityWarning30SentAt: null,
        inactivityWarning7SentAt: null,
        inactivityWarning1SentAt: null,
      },
    });

    try {
      await this.notify.notifyUser({ userId, event: 'account-reactivated', variables: {} });
    } catch (error) {
      this.logger.error(`[account-reactivation] notification échouée pour user=${userId}`, error);
    }

    return true;
  }

  // Messages affichés par le bandeau de compte suspendu côté frontend (voir
  // AccountController.getStatus()) — logique de présentation pure, extraite
  // du controller pour respecter l'invariant "aucune logique métier dans les
  // controllers" (voir /review).
  resolveStatus(user: { accountStatus: AccountStatus; role: UserRole }): AccountStatusResponse {
    // SUSPENDED_ADMIN n'atteint jamais ce code : JwtAuthGuard rejette déjà
    // ces requêtes en 401 avant le controller (voir jwt-auth.guard.ts) — un
    // compte suspendu par un admin ne peut pas se connecter du tout, message
    // "Compte suspendu" affiché directement sur la page de login. Vérifié en
    // conditions réelles le 2026-08-12 (voir progress-tracker.md unité 37).
    if (user.accountStatus === 'SUSPENDED_INACTIVITY') {
      return {
        accountStatus: user.accountStatus,
        suspendedReason:
          'Compte inactif depuis plus de 60 jours, sans bien enregistré ni mandat actif.',
        unblockCondition:
          user.role === 'MANAGER'
            ? 'Enregistrez un bien ou acceptez un mandat pour réactiver votre compte.'
            : 'Enregistrez un bien pour réactiver votre compte.',
      };
    }

    if (user.accountStatus === 'SUSPENDED_PAYMENT') {
      return {
        accountStatus: user.accountStatus,
        suspendedReason: 'Abonnement impayé.',
        unblockCondition: 'Régularisez votre abonnement pour réactiver votre compte.',
      };
    }

    return { accountStatus: user.accountStatus, suspendedReason: null, unblockCondition: null };
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma, PlatformSettings } from '@prisma/client';
import { addMonths } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';

const FREE_PROMOTION_MONTHS = 6;

const SINGLETON_ID = 'singleton';

// Réglages plateforme pilotés par le super-admin (voir /architect
// abonnements, 2026-09-30) — jamais de variable d'environnement pour ces
// interrupteurs : c'est le client (super-admin) qui décide quoi activer sur
// la plateforme, pas le développeur via Railway. Toujours lus frais en base
// (pas de cache) : ils gardent une conséquence financière/quota directe, un
// cache pourrait laisser la plateforme bloquer des créations quelques
// minutes après que l'admin ait cru avoir tout débloqué.
@Injectable()
export class PlatformSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // Lecture pure dans l'immense majorité des cas (la ligne singleton existe
  // dès le premier appel jamais fait sur cette table) — l'upsert ne sert
  // plus qu'au tout premier bootstrap, jamais à chaque lecture. Appelé
  // depuis des chemins chauds (assertQuotaAvailable() à chaque création de
  // bien, getQuotaStatus() à chaque chargement du profil) : un upsert
  // systématique y aurait verrouillé une ligne partagée par toute la
  // plateforme à chaque appel (trouvé en /review abonnements, 2026-10-01).
  async get(): Promise<PlatformSettings> {
    const existing = await this.prisma.platformSettings.findUnique({
      where: { id: SINGLETON_ID },
    });
    if (existing) return existing;

    return this.prisma.platformSettings.upsert({
      where: { id: SINGLETON_ID },
      update: {},
      create: { id: SINGLETON_ID },
    });
  }

  // `freePromotionEndsAt` n'est jamais un champ exposé à l'admin — calculée
  // ici automatiquement (+6 mois) dès que `subscriptionQuotasSuspended`
  // passe à true, effacée dès qu'il repasse à false. Un seul bouton côté
  // admin ("Suspendre les quotas") active les deux à la fois, pour que le
  // bandeau promotionnel frontend ne puisse jamais afficher une promesse
  // que le quota réel ne tient pas (voir /architect bandeau promotionnel,
  // 2026-10-02).
  async update(data: {
    subscriptionQuotasSuspended?: boolean;
    subscriptionBillingEnabled?: boolean;
  }): Promise<PlatformSettings> {
    const current = await this.get(); // garantit que la ligne singleton existe avant l'update

    const patch: Prisma.PlatformSettingsUpdateInput = { ...data };
    // Ne recalculer/effacer la date que sur une vraie transition — sinon un
    // second appel avec `true` (déjà actif) repousserait silencieusement la
    // fin de promo de 6 mois à chaque fois (voir /review, 2026-10-03).
    if (
      data.subscriptionQuotasSuspended === true &&
      current.subscriptionQuotasSuspended === false
    ) {
      patch.freePromotionEndsAt = addMonths(new Date(), FREE_PROMOTION_MONTHS);
    } else if (
      data.subscriptionQuotasSuspended === false &&
      current.subscriptionQuotasSuspended === true
    ) {
      patch.freePromotionEndsAt = null;
    }

    return this.prisma.platformSettings.update({ where: { id: SINGLETON_ID }, data: patch });
  }

  async quotasSuspended(): Promise<boolean> {
    return (await this.get()).subscriptionQuotasSuspended;
  }

  async billingEnabled(): Promise<boolean> {
    return (await this.get()).subscriptionBillingEnabled;
  }
}

import { Injectable } from '@nestjs/common';
import { PlatformSettings } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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

  async get(): Promise<PlatformSettings> {
    return this.prisma.platformSettings.upsert({
      where: { id: SINGLETON_ID },
      update: {},
      create: { id: SINGLETON_ID },
    });
  }

  async update(data: {
    subscriptionQuotasSuspended?: boolean;
    subscriptionBillingEnabled?: boolean;
  }): Promise<PlatformSettings> {
    await this.get(); // garantit que la ligne singleton existe avant l'update
    return this.prisma.platformSettings.update({ where: { id: SINGLETON_ID }, data });
  }

  async quotasSuspended(): Promise<boolean> {
    return (await this.get()).subscriptionQuotasSuspended;
  }

  async billingEnabled(): Promise<boolean> {
    return (await this.get()).subscriptionBillingEnabled;
  }
}

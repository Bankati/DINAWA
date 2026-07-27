import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Lease, PaymentScheduleEntry, Property } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { canActOnProperty } from '../../common/permissions/property-access';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { TerminateLeaseDto } from './dto/terminate-lease.dto';

// La création d'un bail a été fusionnée dans AuthService.inviteTenant()
// (voir /architect révision paiements, 2026-07-25) — ce service ne couvre
// plus que le cycle de vie d'un bail déjà créé : résiliation et lecture de
// l'échéancier. buildScheduleEntries() a déménagé dans schedule-builder.ts,
// partagé avec AuthService.
@Injectable()
export class LeasesService {
  constructor(private readonly prisma: PrismaService) {}

  // Libère le bien et purge les échéances futures jamais touchées par un
  // paiement — évite de laisser des PENDING fantômes sur un bail résilié
  // (voir /architect unité 15). Les échéances passées ou en cours restent
  // intactes, y compris celles avec un paiement partiel : les quittances
  // passées doivent rester générables à la volée (build-plan.md unité 15).
  async terminate(user: AuthenticatedUser, id: string, dto: TerminateLeaseDto): Promise<Lease> {
    const lease = await this.getLeaseOrThrow(id);
    const property = await this.getPropertyOrThrow(lease.propertyId);
    const access = await canActOnProperty(this.prisma, user, property);
    if (!access.canMutate) throw new ForbiddenException('Accès refusé à ce bien');

    if (lease.status === 'TERMINATED') {
      throw new ConflictException('Ce bail est déjà résilié');
    }

    const terminatedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lease.update({
        where: { id },
        data: { status: 'TERMINATED', terminatedAt, terminationReason: dto.terminationReason },
      });

      await tx.paymentScheduleEntry.deleteMany({
        where: { leaseId: id, periodStart: { gte: terminatedAt }, payments: { none: {} } },
      });

      await tx.property.update({ where: { id: lease.propertyId }, data: { status: 'VACANT' } });

      return updated;
    });
  }

  // Voir build-plan.md unité 16 — renvoie le calendrier complet, statut de
  // chaque échéance tel qu'enregistré (mis à jour explicitement à chaque
  // paiement, voir PaymentsService/PaymentDeclarationsService, pas
  // recalculé à la volée ici). Accessible au locataire lui-même pour son
  // propre bail — canActOnProperty() ne le couvre pas (il porte sur qui
  // peut *agir* sur un bien, pas sur le locataire qui y habite), même
  // principe que TenantsService.getTenantLeasesHistory().
  async getSchedule(user: AuthenticatedUser, leaseId: string): Promise<PaymentScheduleEntry[]> {
    const lease = await this.getLeaseOrThrow(leaseId);

    if (user.role !== 'TENANT' || user.id !== lease.tenantUserId) {
      const property = await this.getPropertyOrThrow(lease.propertyId);
      const access = await canActOnProperty(this.prisma, user, property);
      if (!access.canRead) throw new ForbiddenException('Accès refusé à ce bien');
    }

    return this.prisma.paymentScheduleEntry.findMany({
      where: { leaseId },
      orderBy: { periodStart: 'asc' },
    });
  }

  private async getPropertyOrThrow(id: string): Promise<Property> {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException('Bien introuvable');
    return property;
  }

  private async getLeaseOrThrow(id: string): Promise<Lease> {
    const lease = await this.prisma.lease.findUnique({ where: { id } });
    if (!lease) throw new NotFoundException('Bail introuvable');
    return lease;
  }
}

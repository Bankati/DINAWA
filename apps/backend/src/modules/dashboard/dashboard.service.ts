import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { propertyVisibilityWhere } from '../../common/permissions/property-access';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';

export type DashboardKPI = {
  totalBiens: number;
  biensOccupes: number;
  biensVacants: number;
  totalLocataires: number;
  revenusMensuels: number;
  revenusAnnuels: number;
  impayes: number;
  tauxOccupation: number;
};

export type RevenuMensuel = { mois: string; montant: number; paiements: number };

export type RepartitionType = { type: string; montant: number; nombreBiens: number };

export type DashboardSummary = {
  kpis: DashboardKPI;
  revenusMensuels: RevenuMensuel[];
  repartitionLoyersParType: RepartitionType[];
  derniersBiens: {
    id: string;
    type: string;
    status: string;
    neighborhood: string;
    city: string;
    monthlyRent: number;
    createdAt: Date;
  }[];
  derniersPaiements: {
    id: string;
    locataire: string;
    bien: string;
    montant: number;
    date: Date | null;
    statut: string;
  }[];
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    user: AuthenticatedUser,
    annee: number,
    mois?: number,
  ): Promise<DashboardSummary> {
    const yearStart = new Date(Date.UTC(annee, 0, 1));
    const yearEnd = new Date(Date.UTC(annee, 11, 31, 23, 59, 59));
    const moisSelectionne = (mois ?? new Date().getUTCMonth() + 1) - 1;

    const propWhere = propertyVisibilityWhere(user);
    const leaseWhere: Prisma.PaymentWhereInput = { lease: { property: propWhere } };

    const [
      totalBiens,
      biensOccupes,
      biensVacants,
      totalLocataires,
      biensRecents,
      paiementsRecents,
      overdueCount,
      paidPayments,
      repartitionParType,
    ] = await Promise.all([
      this.prisma.property.count({ where: propWhere }),
      this.prisma.property.count({ where: { ...propWhere, status: 'OCCUPIED' } }),
      this.prisma.property.count({ where: { ...propWhere, status: 'VACANT' } }),
      this.prisma.user.count({
        where: { role: 'TENANT', tenantProfile: { invitedByUserId: user.id } },
      }),
      this.prisma.property.findMany({
        where: propWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          status: true,
          neighborhood: true,
          city: true,
          monthlyRent: true,
          createdAt: true,
        },
      }),
      this.prisma.payment.findMany({
        where: leaseWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          paidAmount: true,
          paidAt: true,
          status: true,
          lease: {
            select: {
              property: { select: { neighborhood: true, city: true } },
              tenant: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      // `Payment.status` ne prend jamais la valeur OVERDUE (posée uniquement
      // sur `PaymentScheduleEntry.status` par le cron overdue.task.ts) — une
      // échéance jamais payée n'a simplement aucune ligne Payment. Même
      // requête que DashboardManagerService.getAlerts().
      this.prisma.paymentScheduleEntry.count({
        where: { status: 'OVERDUE', lease: { property: propWhere } },
      }),
      this.prisma.payment.findMany({
        where: {
          ...leaseWhere,
          status: 'PAID',
          paidAt: { gte: yearStart, lte: yearEnd },
        },
        select: { paidAmount: true, paidAt: true },
      }),
      // Composition du portefeuille par type — état courant, non filtré par
      // mois/année (comme `impayes`), voir /architect refonte dashboard.
      this.prisma.property.groupBy({
        by: ['type'],
        where: propWhere,
        _sum: { monthlyRent: true },
        _count: { _all: true },
      }),
    ]);

    const revenusAnnuels = paidPayments.reduce((s, p) => s + p.paidAmount, 0);
    const revenusMensuels = paidPayments
      .filter((p) => p.paidAt && new Date(p.paidAt).getUTCMonth() === moisSelectionne)
      .reduce((s, p) => s + p.paidAmount, 0);

    return {
      kpis: {
        totalBiens,
        biensOccupes,
        biensVacants,
        totalLocataires,
        revenusMensuels,
        revenusAnnuels,
        impayes: overdueCount,
        tauxOccupation: totalBiens > 0 ? Math.round((biensOccupes / totalBiens) * 100) : 0,
      },
      revenusMensuels: this.bucketByMonth(paidPayments, annee),
      repartitionLoyersParType: repartitionParType.map((r) => ({
        type: r.type,
        montant: r._sum.monthlyRent ?? 0,
        nombreBiens: r._count._all,
      })),
      derniersBiens: biensRecents.map((b) => ({
        id: b.id,
        type: b.type,
        status: b.status,
        neighborhood: b.neighborhood,
        city: b.city,
        monthlyRent: b.monthlyRent,
        createdAt: b.createdAt,
      })),
      derniersPaiements: paiementsRecents.map((p) => ({
        id: p.id,
        locataire: p.lease?.tenant
          ? `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}`
          : 'Locataire',
        bien: p.lease?.property
          ? `${p.lease.property.neighborhood}, ${p.lease.property.city}`
          : 'Bien',
        montant: p.paidAmount,
        date: p.paidAt,
        statut: p.status,
      })),
    };
  }

  private bucketByMonth(
    payments: { paidAmount: number; paidAt: Date | null }[],
    annee: number,
  ): RevenuMensuel[] {
    const buckets = new Map<string, { montant: number; paiements: number }>();
    for (let m = 0; m < 12; m++) {
      buckets.set(`${annee}-${String(m + 1).padStart(2, '0')}`, { montant: 0, paiements: 0 });
    }
    for (const p of payments) {
      if (!p.paidAt) continue;
      const d = new Date(p.paidAt);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.montant += p.paidAmount;
        bucket.paiements += 1;
      }
    }
    return Array.from(buckets.entries()).map(([mois, v]) => ({ mois, ...v }));
  }
}

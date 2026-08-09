import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { addDays } from 'date-fns';
import { PropertyStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { canActOnProperty } from '../../common/permissions/property-access';
import { propertyScopeWhere } from './dashboard-scope';
import { computeChangePercent, resolvePeriod } from './period';
import {
  DashboardPeriodType,
  DashboardScope,
  ManagerDashboardAlerts,
  ManagerDashboardOwner,
  ManagerDashboardPerformance,
  ManagerDashboardRevenue,
  ManagerDashboardSummary,
  ManagerDashboardUpcomingPayment,
} from './dashboard.types';
import { RevenueQueryDto } from './dto/revenue-query.dto';

const EMPTY_STATUS_BREAKDOWN: Record<PropertyStatus, number> = {
  OCCUPIED: 0,
  VACANT: 0,
  RENOVATION: 0,
  ARCHIVED: 0,
};

// Tableau de bord gestionnaire (build-plan.md unité 32) — première
// utilisation de requêtes d'agrégation Prisma (`groupBy`/`aggregate`) dans
// ce backend, jusqu'ici seuls des `_count` simples existaient (admin.service.ts).
@Injectable()
export class DashboardManagerService {
  constructor(private readonly prisma: PrismaService) {}

  // Toujours scope MANAGED (biens sous mandat ACTIVE) — c'est la définition
  // même de « bien géré » (voir /architect unité 32), aucun filtre de
  // périmètre ici.
  async getSummary(user: AuthenticatedUser): Promise<ManagerDashboardSummary> {
    const [byStatus, mandatingOwners] = await Promise.all([
      this.prisma.property.groupBy({
        by: ['status'],
        where: { mandates: { some: { managerId: user.id, status: 'ACTIVE' } } },
        _count: { _all: true },
      }),
      this.prisma.mandate.findMany({
        where: { managerId: user.id, status: 'ACTIVE' },
        select: { ownerId: true },
        distinct: ['ownerId'],
      }),
    ]);

    const statusBreakdown = { ...EMPTY_STATUS_BREAKDOWN };
    let total = 0;
    for (const row of byStatus) {
      statusBreakdown[row.status] = row._count._all;
      total += row._count._all;
    }

    return {
      totalManagedProperties: total,
      byStatus: statusBreakdown,
      mandatingOwnersCount: mandatingOwners.length,
    };
  }

  // Ventilation biens propres / biens sous mandat toujours affichée côte à
  // côte (demande explicite du build-plan) — `ownerId` ne restreint que le
  // volet « sous mandat » (voir /architect unité 32).
  async getRevenue(
    user: AuthenticatedUser,
    dto: RevenueQueryDto,
  ): Promise<ManagerDashboardRevenue> {
    const { start, end, previousStart, previousEnd, label } = resolvePeriod(dto);

    const [ownProperties, managedProperties] = await Promise.all([
      this.prisma.property.findMany({ where: { ownerId: user.id }, select: { id: true } }),
      this.prisma.property.findMany({
        where: {
          mandates: { some: { managerId: user.id, status: 'ACTIVE' } },
          ...(dto.ownerId ? { ownerId: dto.ownerId } : {}),
        },
        select: { id: true },
      }),
    ]);
    const ownIds = ownProperties.map((p) => p.id);
    const managedIds = managedProperties.map((p) => p.id);

    const sumFor = (propertyIds: string[], from: Date, to: Date): Promise<number> =>
      propertyIds.length === 0
        ? Promise.resolve(0)
        : this.prisma.payment
            .aggregate({
              _sum: { paidAmount: true },
              where: {
                status: 'PAID',
                paidAt: { gte: from, lte: to },
                lease: { propertyId: { in: propertyIds } },
              },
            })
            .then((r) => r._sum.paidAmount ?? 0);

    const [ownCurrent, ownPrevious, managedCurrent, managedPrevious] = await Promise.all([
      sumFor(ownIds, start, end),
      sumFor(ownIds, previousStart, previousEnd),
      sumFor(managedIds, start, end),
      sumFor(managedIds, previousStart, previousEnd),
    ]);

    return {
      period: { type: dto.period ?? DashboardPeriodType.MONTH, label },
      ownProperties: {
        current: ownCurrent,
        previous: ownPrevious,
        changePercent: computeChangePercent(ownCurrent, ownPrevious),
      },
      managedProperties: {
        current: managedCurrent,
        previous: managedPrevious,
        changePercent: computeChangePercent(managedCurrent, managedPrevious),
      },
      total: {
        current: ownCurrent + managedCurrent,
        previous: ownPrevious + managedPrevious,
        changePercent: computeChangePercent(
          ownCurrent + managedCurrent,
          ownPrevious + managedPrevious,
        ),
      },
    };
  }

  // Périmètre par défaut ALL (voir /architect unité 32) : les alertes sont
  // une liste de choses à traiter par le gestionnaire, aussi bien sur ses
  // biens propres que sous mandat.
  async getAlerts(user: AuthenticatedUser, scope: DashboardScope): Promise<ManagerDashboardAlerts> {
    const propertyWhere = propertyScopeWhere(user, scope);
    const in30Days = addDays(new Date(), 30);

    const [overdueEntries, expiringLeases, pendingDeclarations] = await Promise.all([
      this.prisma.paymentScheduleEntry.findMany({
        where: { status: 'OVERDUE', lease: { property: propertyWhere } },
        select: {
          id: true,
          dueDate: true,
          expectedAmount: true,
          paidAmount: true,
          lease: {
            select: {
              property: { select: { id: true, address: true } },
              tenant: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
        take: 100,
      }),
      this.prisma.lease.findMany({
        where: {
          status: 'ACTIVE',
          endDate: { gte: new Date(), lte: in30Days },
          property: propertyWhere,
        },
        select: {
          id: true,
          endDate: true,
          property: { select: { id: true, address: true } },
          tenant: { select: { id: true, firstName: true, lastName: true } },
        },
        take: 100,
      }),
      this.prisma.payment.findMany({
        where: { status: 'PENDING_CONFIRMATION', lease: { property: propertyWhere } },
        select: {
          id: true,
          paidAmount: true,
          createdAt: true,
          lease: {
            select: {
              property: { select: { id: true, address: true } },
              tenant: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
        take: 100,
      }),
    ]);

    return {
      overdueEntries: overdueEntries.map((e) => ({
        id: e.id,
        dueDate: e.dueDate,
        expectedAmount: e.expectedAmount,
        paidAmount: e.paidAmount,
        property: e.lease.property,
        tenant: e.lease.tenant,
      })),
      expiringLeases: expiringLeases.map((l) => ({
        id: l.id,
        endDate: l.endDate,
        property: l.property,
        tenant: l.tenant,
      })),
      pendingDeclarations: pendingDeclarations.map((p) => ({
        id: p.id,
        paidAmount: p.paidAmount,
        createdAt: p.createdAt,
        property: p.lease.property,
        tenant: p.lease.tenant,
      })),
    };
  }

  // Toujours scope mandat par nature (voir /architect unité 32) — un
  // "propriétaire mandant" n'existe que via un Mandate ACTIVE.
  async getOwners(user: AuthenticatedUser): Promise<ManagerDashboardOwner[]> {
    const mandates = await this.prisma.mandate.findMany({
      where: { managerId: user.id, status: 'ACTIVE' },
      select: {
        ownerId: true,
        owner: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
      take: 100,
    });

    const byOwner = new Map<string, ManagerDashboardOwner>();
    for (const mandate of mandates) {
      const existing = byOwner.get(mandate.ownerId);
      if (existing) {
        existing.managedPropertiesCount += 1;
      } else {
        byOwner.set(mandate.ownerId, { ...mandate.owner, managedPropertiesCount: 1 });
      }
    }
    return [...byOwner.values()];
  }

  async getUpcomingPayments(
    user: AuthenticatedUser,
    scope: DashboardScope,
  ): Promise<ManagerDashboardUpcomingPayment[]> {
    const entries = await this.prisma.paymentScheduleEntry.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { gte: new Date() },
        lease: { property: propertyScopeWhere(user, scope) },
      },
      select: {
        id: true,
        dueDate: true,
        expectedAmount: true,
        paidAmount: true,
        lease: {
          select: {
            property: { select: { id: true, address: true } },
            tenant: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 100,
    });

    return entries.map((e) => ({
      id: e.id,
      dueDate: e.dueDate,
      expectedAmount: e.expectedAmount,
      paidAmount: e.paidAmount,
      property: e.lease.property,
      tenant: e.lease.tenant,
    }));
  }

  // Accès vérifié comme n'importe quelle lecture de bien (canActOnProperty)
  // — propriétaire réel ou mandataire actif, jamais un tiers.
  async getPropertyPerformance(
    user: AuthenticatedUser,
    propertyId: string,
  ): Promise<ManagerDashboardPerformance> {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Bien introuvable');
    const access = await canActOnProperty(this.prisma, user, property);
    if (!access.canRead) throw new ForbiddenException('Accès refusé à ce bien');

    const sixMonthsAgo = addDays(new Date(), -180);
    const entries = await this.prisma.paymentScheduleEntry.findMany({
      where: { lease: { propertyId }, dueDate: { gte: sixMonthsAgo, lt: new Date() } },
      select: { status: true, overdueAlertSentAt: true },
      take: 100,
    });

    const total = entries.length;
    const onTime = entries.filter(
      (e) => e.status === 'PAID' && e.overdueAlertSentAt === null,
    ).length;

    return {
      propertyId,
      periodMonths: 6,
      totalDueEntries: total,
      onTimeCount: onTime,
      onTimeRatePercent: total === 0 ? null : Math.round((onTime / total) * 100),
    };
  }
}

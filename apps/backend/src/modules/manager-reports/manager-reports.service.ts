import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ConsolidatedReportData,
  ReportOverdueEntry,
  ReportPropertyPayments,
  ReportProcessedDeclaration,
} from './manager-reports.types';

export interface MonthRange {
  start: Date;
  end: Date;
  label: string;
}

// Calcul en arithmétique UTC pure (Date.UTC), jamais via des fonctions
// calendaires dépendantes du fuseau local — même correctif que period.ts
// (voir /review unité 32).
export function currentMonthRange(): MonthRange {
  return monthRangeFor(new Date(), 0);
}

export function previousMonthRange(): MonthRange {
  return monthRangeFor(new Date(), -1);
}

function monthRangeFor(reference: Date, monthOffset: number): MonthRange {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth() + monthOffset;
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return {
    start,
    end,
    label: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`,
  };
}

// Rapport consolidé par propriétaire mandant (voir /architect unité 33) —
// jamais par mandat individuel. Source de vérité unique pour le contenu du
// rapport, réutilisée à la fois par le cron d'envoi et par l'endpoint de
// prévisualisation, pour qu'ils ne divergent jamais.
@Injectable()
export class ManagerReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getConsolidatedReportData(
    managerId: string,
    ownerId: string,
    period: MonthRange,
  ): Promise<ConsolidatedReportData> {
    const [mandates, manager, owner] = await Promise.all([
      this.prisma.mandate.findMany({
        where: { managerId, ownerId, status: 'ACTIVE' },
        select: {
          propertyId: true,
          acceptedAt: true,
          property: { select: { id: true, address: true } },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: managerId },
        select: { id: true, firstName: true, lastName: true },
      }),
      this.prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
    ]);

    if (mandates.length === 0 || !manager || !owner) {
      throw new NotFoundException('Aucun mandat actif avec ce propriétaire');
    }

    // Un mandat accepté en cours de mois n'est compté qu'à partir de son
    // acceptation, jamais avant (voir /architect unité 33) — appliqué aux
    // paiements et déclarations, pas aux retards en cours (l'échéance
    // impayée d'un bien reste pertinente pour le propriétaire quelle que
    // soit la date d'acceptation du mandat).
    const effectiveStartByProperty = new Map<string, Date>(
      mandates.map((m) => [
        m.propertyId,
        m.acceptedAt && m.acceptedAt > period.start ? m.acceptedAt : period.start,
      ]),
    );
    const propertyIds = mandates.map((m) => m.propertyId);
    const properties = mandates.map((m) => m.property);

    const [payments, overdueEntries, declarations] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          status: 'PAID',
          paidAt: { gte: period.start, lte: period.end },
          lease: { propertyId: { in: propertyIds } },
        },
        select: {
          id: true,
          paidAmount: true,
          paidAt: true,
          paymentMethod: true,
          lease: { select: { propertyId: true } },
        },
        take: 100,
      }),
      this.prisma.paymentScheduleEntry.findMany({
        where: { status: 'OVERDUE', lease: { propertyId: { in: propertyIds } } },
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
      this.prisma.payment.findMany({
        where: {
          source: 'TENANT_DECLARATION',
          status: { in: ['PAID', 'REJECTED'] },
          lease: { propertyId: { in: propertyIds } },
          OR: [
            { status: 'PAID', confirmedAt: { gte: period.start, lte: period.end } },
            { status: 'REJECTED', updatedAt: { gte: period.start, lte: period.end } },
          ],
        },
        select: {
          id: true,
          status: true,
          paidAmount: true,
          confirmedAt: true,
          updatedAt: true,
          lease: {
            select: {
              propertyId: true,
              property: { select: { id: true, address: true } },
              tenant: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
        take: 100,
      }),
    ]);

    const paidWithinMandate = payments.filter((p) => {
      const effectiveStart = effectiveStartByProperty.get(p.lease.propertyId);
      return p.paidAt && effectiveStart && p.paidAt >= effectiveStart;
    });

    const paymentsByProperty: ReportPropertyPayments[] = properties.map((property) => {
      const propertyPayments = paidWithinMandate.filter((p) => p.lease.propertyId === property.id);
      return {
        property,
        payments: propertyPayments.map((p) => ({
          id: p.id,
          paidAmount: p.paidAmount,
          paidAt: p.paidAt,
          paymentMethod: p.paymentMethod,
        })),
        totalReceived: propertyPayments.reduce((sum, p) => sum + p.paidAmount, 0),
      };
    });

    const overdue: ReportOverdueEntry[] = overdueEntries.map((e) => ({
      id: e.id,
      dueDate: e.dueDate,
      expectedAmount: e.expectedAmount,
      paidAmount: e.paidAmount,
      property: e.lease.property,
      tenant: e.lease.tenant,
    }));

    const processedDeclarations: ReportProcessedDeclaration[] = declarations
      .map((d) => ({
        ...d,
        processedAt: d.status === 'PAID' ? (d.confirmedAt ?? d.updatedAt) : d.updatedAt,
      }))
      .filter((d) => {
        const effectiveStart = effectiveStartByProperty.get(d.lease.propertyId);
        return effectiveStart !== undefined && d.processedAt >= effectiveStart;
      })
      .map((d) => ({
        id: d.id,
        status: d.status as 'PAID' | 'REJECTED',
        paidAmount: d.paidAmount,
        processedAt: d.processedAt,
        property: d.lease.property,
        tenant: d.lease.tenant,
      }));

    return {
      owner,
      manager,
      periodLabel: period.label,
      periodStart: period.start,
      periodEnd: period.end,
      properties,
      paymentsByProperty,
      totalReceived: paidWithinMandate.reduce((sum, p) => sum + p.paidAmount, 0),
      overdueEntries: overdue,
      processedDeclarations,
    };
  }
}

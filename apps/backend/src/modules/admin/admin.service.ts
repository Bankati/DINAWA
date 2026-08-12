import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseAdminService } from '../supabase/supabase-admin.service';
import { NotifyService } from '../notify/notify.service';
import { SUBSCRIPTION_TIERS } from '../../common/constants';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly notify: NotifyService,
  ) {}

  async listUsers(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = { anonymizedAt: null };
    if (query.role) where.role = query.role;
    if (query.status) where.accountStatus = query.status;
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          accountStatus: true,
          city: true,
          createdAt: true,
          _count: {
            select: {
              ownedProperties: true,
              leasesAsTenant: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, total, page, limit };
  }

  async getStats(
    annee: number = new Date().getUTCFullYear(),
    mois: number = new Date().getUTCMonth() + 1,
  ) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const selectedMonthStart = new Date(Date.UTC(annee, mois - 1, 1));
    const selectedMonthEnd = new Date(Date.UTC(annee, mois, 0, 23, 59, 59, 999));
    const yearStart = new Date(Date.UTC(annee, 0, 1));
    const yearEnd = new Date(Date.UTC(annee, 11, 31, 23, 59, 59, 999));

    const [
      totalUsers,
      totalProperties,
      activeLeases,
      revenusMonth,
      newUsersThisMonth,
      newUsersLastMonth,
      repartitionParType,
      paiementsAnnee,
      comptesSuspendus,
      activeSubscriptions,
    ] = await Promise.all([
      this.prisma.user.count({ where: { anonymizedAt: null } }),
      this.prisma.property.count(),
      this.prisma.lease.count({ where: { status: 'ACTIVE' } }),
      this.prisma.payment.aggregate({
        _sum: { paidAmount: true },
        where: { status: 'PAID', paidAt: { gte: selectedMonthStart, lte: selectedMonthEnd } },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfMonth }, anonymizedAt: null } }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            lt: startOfMonth,
          },
          anonymizedAt: null,
        },
      }),
      // Composition du parc immobilier plateforme par type — même agrégation
      // que DashboardService.getSummary() côté propriétaire, sans filtre de
      // portefeuille (vue admin = toute la plateforme).
      this.prisma.property.groupBy({
        by: ['type'],
        _sum: { monthlyRent: true },
        _count: { _all: true },
      }),
      this.prisma.payment.findMany({
        where: { status: 'PAID', paidAt: { gte: yearStart, lte: yearEnd } },
        select: { paidAmount: true, paidAt: true },
      }),
      this.prisma.user.count({
        where: { anonymizedAt: null, accountStatus: { not: 'ACTIVE' } },
      }),
      // MRR théorique — aucune collecte réelle n'existe encore (unité 36,
      // prélèvement mensuel, reportée). Exclut les abonnements encore en
      // période bêta gratuite (betaUntil dans le futur), qui ne représentent
      // aucun revenu actuel malgré un statut ACTIVE.
      this.prisma.subscription.findMany({
        where: {
          status: { in: ['ACTIVE', 'PENDING_CANCELLATION'] },
          OR: [{ betaUntil: null }, { betaUntil: { lt: now } }],
        },
        select: { tier: true },
      }),
    ]);

    const croissance =
      newUsersLastMonth > 0
        ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
        : 0;

    const mrr = activeSubscriptions.reduce(
      (sum, s) => sum + SUBSCRIPTION_TIERS[s.tier].priceFcfa,
      0,
    );

    return {
      nombreUtilisateurs: totalUsers,
      nombreBiens: totalProperties,
      tauxOccupation: totalProperties > 0 ? Math.round((activeLeases / totalProperties) * 100) : 0,
      volumeTransactionsMois: revenusMonth._sum.paidAmount ?? 0,
      nombreLitigesOuverts: 0,
      comptesSuspendus,
      mrr,
      croissanceUtilisateursMois: croissance,
      repartitionBiensParType: repartitionParType.map((r) => ({
        type: r.type,
        montant: r._sum.monthlyRent ?? 0,
        nombreBiens: r._count._all,
      })),
      revenusMensuels: this.bucketByMonth(paiementsAnnee, annee),
    };
  }

  // Classement par volume de loyers réellement encaissés — le regroupement
  // par propriétaire traverse une relation (Payment -> Lease.ownerId), non
  // exprimable en un seul groupBy Prisma (limité aux colonnes propres au
  // modèle agrégé). Agrégation en mémoire, cohérente avec l'échelle actuelle
  // de la plateforme (même choix déjà fait par bucketByMonth ci-dessus).
  async topOwners(limit = 10, from?: string, to?: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'PAID',
        ...(from || to
          ? {
              paidAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      select: {
        paidAmount: true,
        lease: { select: { owner: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });

    const totals = new Map<string, { firstName: string; lastName: string; total: number }>();
    for (const p of payments) {
      const { owner } = p.lease;
      const entry = totals.get(owner.id) ?? {
        firstName: owner.firstName,
        lastName: owner.lastName,
        total: 0,
      };
      entry.total += p.paidAmount;
      totals.set(owner.id, entry);
    }

    return Array.from(totals.entries())
      .map(([id, v]) => ({
        id,
        firstName: v.firstName,
        lastName: v.lastName,
        totalPaidAmount: v.total,
      }))
      .sort((a, b) => b.totalPaidAmount - a.totalPaidAmount)
      .slice(0, limit);
  }

  async topManagers(limit = 10) {
    const grouped = await this.prisma.mandate.groupBy({
      by: ['managerId'],
      where: { status: 'ACTIVE' },
      _count: { _all: true },
      orderBy: { _count: { managerId: 'desc' } },
      take: limit,
    });
    if (grouped.length === 0) return [];

    const managers = await this.prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.managerId) } },
      select: { id: true, firstName: true, lastName: true },
    });
    const byId = new Map(managers.map((m) => [m.id, m]));

    return grouped.map((g) => ({
      id: g.managerId,
      firstName: byId.get(g.managerId)?.firstName ?? '',
      lastName: byId.get(g.managerId)?.lastName ?? '',
      activeMandatesCount: g._count._all,
    }));
  }

  async listTransactions(query: ListTransactionsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where: Prisma.PaymentWhereInput = {
      ...(query.source ? { source: query.source } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      ...(query.from || query.to
        ? {
            paidAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          source: true,
          status: true,
          paymentMethod: true,
          paidAmount: true,
          paidAt: true,
          createdAt: true,
          lease: {
            select: {
              tenant: { select: { firstName: true, lastName: true } },
              owner: { select: { firstName: true, lastName: true } },
              property: { select: { address: true, city: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async listAuditLogs(query: ListAuditLogsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where: Prisma.AuditLogWhereInput = {
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          ipAddress: true,
          createdAt: true,
          actorUserId: true,
          actor: { select: { firstName: true, lastName: true, role: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async suspendUser(id: string, dto: SuspendUserDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, accountStatus: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.role === 'ADMIN') {
      throw new ForbiddenException('Impossible de suspendre un compte administrateur');
    }

    await this.prisma.user.update({
      where: { id },
      data: { accountStatus: 'SUSPENDED_ADMIN', suspensionReason: dto.reason },
    });

    try {
      await this.notify.notifyUser({
        userId: id,
        event: 'account-suspended',
        variables: { reason: dto.reason },
      });
    } catch (error) {
      this.logger.error(`[admin/suspend] notification échouée pour user=${id}`, error);
    }

    return { message: 'Compte suspendu' };
  }

  async reactivateUser(id: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, accountStatus: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.accountStatus === 'ACTIVE') {
      throw new ForbiddenException('Ce compte est déjà actif');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        accountStatus: 'ACTIVE',
        suspensionReason: null,
        inactivityWarning30SentAt: null,
        inactivityWarning7SentAt: null,
        inactivityWarning1SentAt: null,
      },
    });

    try {
      await this.notify.notifyUser({ userId: id, event: 'account-reactivated', variables: {} });
    } catch (error) {
      this.logger.error(`[admin/reactivate] notification échouée pour user=${id}`, error);
    }

    return { message: 'Compte réactivé' };
  }

  private bucketByMonth(
    payments: { paidAmount: number; paidAt: Date | null }[],
    annee: number,
  ): { mois: string; montant: number }[] {
    const buckets = new Map<string, number>();
    for (let m = 0; m < 12; m++) {
      buckets.set(`${annee}-${String(m + 1).padStart(2, '0')}`, 0);
    }
    for (const p of payments) {
      if (!p.paidAt) continue;
      const key = `${annee}-${String(new Date(p.paidAt).getUTCMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, (buckets.get(key) ?? 0) + p.paidAmount);
    }
    return Array.from(buckets.entries()).map(([mois, montant]) => ({ mois, montant }));
  }

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        accountStatus: true,
        suspensionReason: true,
        city: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            ownedProperties: true,
            leasesAsTenant: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, supabaseId: true, email: true },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // Compte Supabase legacy éventuel (authentification interne depuis le
    // 2026-08-11 — un nouveau compte n'a plus jamais de supabaseId, voir
    // architecture.md) — nettoyage best-effort, rien à faire sinon.
    if (user.supabaseId) {
      await this.supabaseAdmin.withRetry(() =>
        this.supabaseAdmin.auth.admin.deleteUser(user.supabaseId!),
      );
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        email: null,
        phone: null,
        firstName: 'Compte',
        lastName: 'Supprimé',
        profilePhotoPath: null,
        supabaseId: null,
        anonymizedAt: new Date(),
      },
    });

    return { message: 'Compte supprimé' };
  }
}

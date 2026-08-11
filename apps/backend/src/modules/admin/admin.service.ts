import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseAdminService } from '../supabase/supabase-admin.service';

export type AdminListUsersQuery = { role?: string; search?: string; page?: number; limit?: number };

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseAdmin: SupabaseAdminService,
  ) {}

  async listUsers(query: AdminListUsersQuery) {
    const { role, search } = query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = { anonymizedAt: null };
    if (role) where.role = role as Prisma.UserWhereInput['role'];
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
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
    ]);

    const croissance =
      newUsersLastMonth > 0
        ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
        : 0;

    return {
      nombreUtilisateurs: totalUsers,
      nombreBiens: totalProperties,
      tauxOccupation: totalProperties > 0 ? Math.round((activeLeases / totalProperties) * 100) : 0,
      volumeTransactionsMois: revenusMonth._sum.paidAmount ?? 0,
      commissionsMois: 0,
      nombreLitigesOuverts: 0,
      croissanceUtilisateursMois: croissance,
      repartitionBiensParType: repartitionParType.map((r) => ({
        type: r.type,
        montant: r._sum.monthlyRent ?? 0,
        nombreBiens: r._count._all,
      })),
      revenusMensuels: this.bucketByMonth(paiementsAnnee, annee),
    };
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
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        accountStatus: true,
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

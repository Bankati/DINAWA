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

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalUsers, totalProperties, activeLeases, revenusMonth, newUsersThisMonth, newUsersLastMonth] =
      await Promise.all([
        this.prisma.user.count({ where: { anonymizedAt: null } }),
        this.prisma.property.count(),
        this.prisma.lease.count({ where: { status: 'ACTIVE' } }),
        this.prisma.payment.aggregate({
          _sum: { paidAmount: true },
          where: { status: 'PAID', paidAt: { gte: startOfMonth } },
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
    };
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

    if (user.supabaseId) {
      await this.supabaseAdmin.withRetry(() =>
        this.supabaseAdmin.auth.admin.deleteUser(user.supabaseId!),
      );
    } else if (user.email) {
      // supabaseId absent mais le compte Supabase Auth peut exister par email
      const { data } = await this.supabaseAdmin.auth.admin.listUsers();
      const match = data?.users?.find((u) => u.email === user.email);
      if (match) {
        await this.supabaseAdmin.withRetry(() =>
          this.supabaseAdmin.auth.admin.deleteUser(match.id),
        );
      }
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

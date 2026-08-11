import { Controller, Get, NotFoundException, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationChannel, NotificationDispatchStatus, Prisma } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';

export type NotificationSummary = {
  id: string;
  event: string;
  titre: string;
  channel: NotificationChannel;
  status: NotificationDispatchStatus;
  payload: Prisma.JsonValue;
  createdAt: Date;
  unread: boolean;
};

// Doit couvrir exactement NotificationEvent (notification-events.ts) — 12
// valeurs. Complété le 2026-08-11 : 'payment-rejected' et 'mandate-created'
// manquaient, l'API retombait sur l'event brut comme titre.
const EVENT_LABELS: Record<string, string> = {
  receipt: 'Quittance disponible',
  'payment-reminder': 'Rappel de loyer',
  'overdue-alert': 'Loyer impayé',
  'payment-declaration-pending': 'Paiement à confirmer',
  'payment-rejected': 'Déclaration rejetée',
  'monthly-report': 'Rapport mensuel disponible',
  'inactivity-warning': 'Compte bientôt suspendu',
  'account-suspended': 'Compte suspendu',
  'account-reactivated': 'Compte réactivé',
  'tenant-invitation': 'Invitation envoyée',
  'lease-created': 'Nouveau bail',
  'mandate-created': 'Proposition de mandat',
};

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotifyController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Historique des notifications de l'utilisateur connecté" })
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ): Promise<NotificationSummary[]> {
    const take = limit ? Math.min(Number(limit), 100) : 50;
    const cacheKey = `notifs:${user.id}:${take}`;
    return this.cache.wrap(cacheKey, 15_000, async () => {
      const notifications = await this.prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take,
        select: {
          id: true,
          event: true,
          channel: true,
          status: true,
          payload: true,
          createdAt: true,
          readAt: true,
        },
      });

      return notifications.map((n) => ({
        id: n.id,
        event: n.event,
        titre: EVENT_LABELS[n.event] ?? n.event,
        channel: n.channel,
        status: n.status,
        payload: n.payload,
        createdAt: n.createdAt,
        unread: n.readAt === null,
      }));
    });
  }

  // Corrigé le 2026-08-11 : remplace l'heuristique "créée dans les dernières
  // 24h" (approximative, jamais décroissante par action utilisateur) par un
  // vrai compteur basé sur readAt — cohérent avec les endpoints
  // marquer-comme-lu ci-dessous.
  @Get('unread-count')
  @ApiOperation({ summary: 'Nombre de notifications non lues' })
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId: user.id, readAt: null },
    });
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marque une notification comme lue' })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    // count = 0 si déjà lue OU si elle n'appartient pas à l'appelant — pas de
    // distinction (404 générique, jamais confirmer l'existence d'une
    // notification d'un tiers).
    if (count === 0) {
      const exists = await this.prisma.notification.findFirst({ where: { id, userId: user.id } });
      if (!exists) throw new NotFoundException('Notification introuvable');
    }
    this.cache.delByPrefix(`notifs:${user.id}:`);
    return { message: 'Notification marquée comme lue' };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marque toutes les notifications comme lues' })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser): Promise<{ message: string }> {
    await this.prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    this.cache.delByPrefix(`notifs:${user.id}:`);
    return { message: 'Toutes les notifications ont été marquées comme lues' };
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationChannel, NotificationDispatchStatus, Prisma } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { PrismaService } from '../../prisma/prisma.service';

export type NotificationSummary = {
  id: string;
  event: string;
  titre: string;
  channel: NotificationChannel;
  status: NotificationDispatchStatus;
  payload: Prisma.JsonValue;
  createdAt: Date;
};

const EVENT_LABELS: Record<string, string> = {
  receipt: 'Quittance disponible',
  'payment-reminder': 'Rappel de loyer',
  'overdue-alert': 'Loyer impayé',
  'payment-declaration-pending': 'Paiement à confirmer',
  'monthly-report': 'Rapport mensuel disponible',
  'inactivity-warning': 'Compte bientôt suspendu',
  'account-suspended': 'Compte suspendu',
  'account-reactivated': 'Compte réactivé',
  'tenant-invitation': 'Invitation envoyée',
  'lease-created': 'Nouveau bail',
};

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotifyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Historique des notifications de l'utilisateur connecté" })
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ): Promise<NotificationSummary[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit ? Math.min(Number(limit), 100) : 50,
      select: {
        id: true,
        event: true,
        channel: true,
        status: true,
        payload: true,
        createdAt: true,
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
    }));
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Nombre de notifications non lues (dernières 24h)' })
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser): Promise<{ count: number }> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await this.prisma.notification.count({
      where: { userId: user.id, createdAt: { gte: since } },
    });
    return { count };
  }
}

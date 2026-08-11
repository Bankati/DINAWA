import { NotFoundException } from '@nestjs/common';
import { NotifyController } from './notify.controller';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';

describe('NotifyController', () => {
  let controller: NotifyController;
  let prisma: {
    notification: {
      findMany: jest.Mock;
      count: jest.Mock;
      updateMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };
  let cache: { wrap: jest.Mock; delByPrefix: jest.Mock };

  const user = { id: 'user-1' } as AuthenticatedUser;

  beforeEach(() => {
    prisma = {
      notification: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    // wrap() exécute directement fn() — même comportement que la vraie
    // implémentation sur un cache froid, suffisant pour ces tests.
    cache = {
      wrap: jest.fn((_key: string, _ttl: number, fn: () => unknown) => fn()),
      delByPrefix: jest.fn(),
    };
    controller = new NotifyController(prisma as never, cache as never);
  });

  describe('getNotifications', () => {
    it('déduit `unread` de `readAt` et remplit le titre depuis EVENT_LABELS', async () => {
      prisma.notification.findMany.mockResolvedValueOnce([
        {
          id: 'n1',
          event: 'payment-rejected',
          channel: 'EMAIL',
          status: 'SENT',
          payload: null,
          createdAt: new Date('2026-08-01'),
          readAt: null,
        },
        {
          id: 'n2',
          event: 'mandate-created',
          channel: 'PUSH',
          status: 'SENT',
          payload: null,
          createdAt: new Date('2026-08-02'),
          readAt: new Date('2026-08-03'),
        },
      ]);

      const result = await controller.getNotifications(user);

      expect(result[0]).toMatchObject({ id: 'n1', titre: 'Déclaration rejetée', unread: true });
      expect(result[1]).toMatchObject({ id: 'n2', titre: 'Proposition de mandat', unread: false });
    });
  });

  describe('getUnreadCount', () => {
    it('compte les notifications readAt=null, pas une fenêtre temporelle', async () => {
      await controller.getUnreadCount(user);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', readAt: null },
      });
    });
  });

  describe('markAsRead', () => {
    it('marque la notification comme lue et invalide le cache liste', async () => {
      const result = await controller.markAsRead(user, 'n1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'n1', userId: 'user-1', readAt: null },
        data: { readAt: expect.any(Date) as Date },
      });
      expect(cache.delByPrefix).toHaveBeenCalledWith('notifs:user-1:');
      expect(result.message).toContain('lue');
    });

    it("lève 404 si la notification n'existe pas ou n'appartient pas à l'appelant", async () => {
      prisma.notification.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.notification.findFirst.mockResolvedValueOnce(null);

      await expect(controller.markAsRead(user, 'not-mine')).rejects.toThrow(NotFoundException);
    });

    it('ne lève pas 404 si la notification existe mais était déjà lue (count=0 légitime)', async () => {
      prisma.notification.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.notification.findFirst.mockResolvedValueOnce({ id: 'n1' });

      await expect(controller.markAsRead(user, 'n1')).resolves.toBeDefined();
    });
  });

  describe('markAllAsRead', () => {
    it('marque toutes les notifications non lues de l’appelant et invalide le cache', async () => {
      await controller.markAllAsRead(user);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', readAt: null },
        data: { readAt: expect.any(Date) as Date },
      });
      expect(cache.delByPrefix).toHaveBeenCalledWith('notifs:user-1:');
    });
  });
});

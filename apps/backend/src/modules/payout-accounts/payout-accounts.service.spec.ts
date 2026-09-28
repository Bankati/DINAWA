import { UnauthorizedException } from '@nestjs/common';
import { PayoutAccountsService } from './payout-accounts.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';

describe('PayoutAccountsService', () => {
  let service: PayoutAccountsService;
  let prisma: {
    $transaction: jest.Mock;
    user: { findUniqueOrThrow: jest.Mock };
    payoutAccount: { findUnique: jest.Mock };
  };
  let tx: {
    payoutAccount: { upsert: jest.Mock };
    payoutAccountChange: { create: jest.Mock };
  };
  let tokens: { comparePassword: jest.Mock };
  let notify: { notifyUser: jest.Mock };

  const user = { id: 'owner-1', role: 'OWNER' } as AuthenticatedUser;
  const dto = { operator: 'TMONEY' as const, phone: '90330557', password: 'secret' };

  beforeEach(() => {
    tx = {
      payoutAccount: {
        upsert: jest.fn().mockResolvedValue({ id: 'acc-1', operator: 'TMONEY', phone: '90330557' }),
      },
      payoutAccountChange: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)),
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ passwordHash: 'hash' }) },
      payoutAccount: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    tokens = { comparePassword: jest.fn().mockResolvedValue(true) };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };
    service = new PayoutAccountsService(prisma as never, tokens as never, notify as never);
  });

  it('refuse un mot de passe incorrect sans rien écrire ni alerter', async () => {
    tokens.comparePassword.mockResolvedValue(false);

    await expect(service.upsert(user, dto)).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(notify.notifyUser).not.toHaveBeenCalled();
  });

  it('enregistre un premier numéro, trace le changement et envoie un email d’alerte forcé', async () => {
    await service.upsert(user, dto);

    expect(tx.payoutAccount.upsert).toHaveBeenCalledWith({
      where: { userId: 'owner-1' },
      create: { userId: 'owner-1', operator: 'TMONEY', phone: '90330557' },
      update: { operator: 'TMONEY', phone: '90330557' },
    });
    expect(tx.payoutAccountChange.create).toHaveBeenCalledWith({
      data: {
        userId: 'owner-1',
        previousOperator: null,
        previousPhone: null,
        newOperator: 'TMONEY',
        newPhone: '90330557',
      },
    });
    expect(notify.notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'owner-1',
        event: 'payout-account-changed',
        forceEmail: true,
        variables: { operator: 'T-Money', phone: '90330557' },
      }),
    );
  });

  it('conserve l’ancien numéro dans l’historique lors d’une modification', async () => {
    prisma.payoutAccount.findUnique.mockResolvedValue({
      id: 'acc-1',
      operator: 'FLOOZ',
      phone: '96000000',
    });

    await service.upsert(user, dto);

    const [changeArgs] = tx.payoutAccountChange.create.mock.calls[0] as [{ data: unknown }];
    expect(changeArgs.data).toMatchObject({ previousOperator: 'FLOOZ', previousPhone: '96000000' });
  });

  it('ne fait rien (ni historique ni alerte) si le numéro est identique', async () => {
    const existing = { id: 'acc-1', operator: 'TMONEY', phone: '90330557' };
    prisma.payoutAccount.findUnique.mockResolvedValue(existing);

    await expect(service.upsert(user, dto)).resolves.toBe(existing);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(notify.notifyUser).not.toHaveBeenCalled();
  });

  it('n’échoue pas si l’email d’alerte échoue — le numéro est déjà enregistré', async () => {
    notify.notifyUser.mockRejectedValue(new Error('resend down'));

    await expect(service.upsert(user, dto)).resolves.toMatchObject({ id: 'acc-1' });
  });
});

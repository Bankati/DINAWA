import { AccountController } from './account.controller';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';

describe('AccountController', () => {
  const controller = new AccountController();

  it('renvoie un statut ACTIVE sans motif ni condition de déblocage', () => {
    const user = { accountStatus: 'ACTIVE', role: 'OWNER' } as AuthenticatedUser;
    expect(controller.getStatus(user)).toEqual({
      accountStatus: 'ACTIVE',
      suspendedReason: null,
      unblockCondition: null,
    });
  });

  it('propose « enregistrer un bien » comme condition de déblocage pour un OWNER suspendu', () => {
    const user = { accountStatus: 'SUSPENDED_INACTIVITY', role: 'OWNER' } as AuthenticatedUser;
    const result = controller.getStatus(user);
    expect(result.accountStatus).toBe('SUSPENDED_INACTIVITY');
    expect(result.suspendedReason).not.toBeNull();
    expect(result.unblockCondition).toContain('bien');
    expect(result.unblockCondition).not.toContain('mandat');
  });

  it('propose aussi « accepter un mandat » comme condition de déblocage pour un MANAGER suspendu', () => {
    const user = { accountStatus: 'SUSPENDED_INACTIVITY', role: 'MANAGER' } as AuthenticatedUser;
    const result = controller.getStatus(user);
    expect(result.unblockCondition).toContain('mandat');
  });

  it('renvoie un motif générique pour un compte SUSPENDED_PAYMENT', () => {
    const user = { accountStatus: 'SUSPENDED_PAYMENT', role: 'OWNER' } as AuthenticatedUser;
    const result = controller.getStatus(user);
    expect(result.accountStatus).toBe('SUSPENDED_PAYMENT');
    expect(result.suspendedReason).not.toBeNull();
    expect(result.unblockCondition).not.toBeNull();
  });
});

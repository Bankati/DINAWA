import { AccountController } from './account.controller';
import { AccountActivationService } from './account-activation.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';

describe('AccountController', () => {
  it('délègue la résolution du statut à AccountActivationService.resolveStatus()', () => {
    const resolved = { accountStatus: 'ACTIVE', suspendedReason: null, unblockCondition: null };
    const accountActivation = { resolveStatus: jest.fn().mockReturnValue(resolved) };
    const controller = new AccountController(
      // Le double cast est nécessaire pour tsc/ts-jest (le mock partiel ne
      // satisfait pas la forme complète du service) même si eslint le
      // signale à tort comme superflu sur ce mock précis.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      accountActivation as never as AccountActivationService,
    );
    const user = { accountStatus: 'ACTIVE', role: 'OWNER' } as AuthenticatedUser;

    const result = controller.getStatus(user);

    expect(accountActivation.resolveStatus).toHaveBeenCalledWith(user);
    expect(result).toBe(resolved);
  });
});

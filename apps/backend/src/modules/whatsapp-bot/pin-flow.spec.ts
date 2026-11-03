import { signToken, verifyToken } from '../../common/utils/signed-token';
import { isPinFlowTokenValid, signPinFlowToken } from './pin-flow';

const SECRET = 'secret-des-liens-de-paiement-test';

describe('jeton du formulaire du code (unité 50)', () => {
  it('valable pour CE locataire et CET écran, pendant 1 h', () => {
    const token = signPinFlowToken('tenant-1', 'CREATE', new Date(), SECRET);
    expect(isPinFlowTokenValid(token, 'tenant-1', 'CREATE', SECRET)).toBe(true);
    expect(isPinFlowTokenValid(token, 'tenant-2', 'CREATE', SECRET)).toBe(false);
    expect(isPinFlowTokenValid(token, 'tenant-1', 'ENTER', SECRET)).toBe(false);
  });

  it('expiré après 1 h', () => {
    const token = signPinFlowToken('tenant-1', 'CREATE', new Date(Date.now() - 61 * 60_000), SECRET);
    expect(isPinFlowTokenValid(token, 'tenant-1', 'CREATE', SECRET)).toBe(false);
  });

  it('jamais accepté comme lien de paiement, et inversement', () => {
    const flowToken = signPinFlowToken('tenant-1', 'CREATE', new Date(), SECRET);
    const payToken = signToken(
      { purpose: 'pay-link', data: { u: 'tenant-1', s: 'CREATE' }, expiresAt: new Date(Date.now() + 3600_000) },
      SECRET,
    );
    expect(isPinFlowTokenValid(payToken, 'tenant-1', 'CREATE', SECRET)).toBe(false);
    expect(() => verifyToken(flowToken, 'pay-link', SECRET)).toThrow();
  });

  it('jeton absent, faux ou secret absent : false, sans jamais lever', () => {
    expect(isPinFlowTokenValid(null, 'tenant-1', 'CREATE', SECRET)).toBe(false);
    expect(isPinFlowTokenValid('abc.def', 'tenant-1', 'CREATE', SECRET)).toBe(false);
    const token = signPinFlowToken('tenant-1', 'CREATE', new Date(), SECRET);
    expect(isPinFlowTokenValid(token, 'tenant-1', 'CREATE', 'un-autre-secret')).toBe(false);
    expect(isPinFlowTokenValid(token, 'tenant-1', 'CREATE', undefined)).toBe(false);
  });
});

import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { MyWhatsappController, TenantWhatsappController } from './whatsapp-consent.controller';

// Les droits fins (bien du bail actif, mandat) sont dans le service ; ici on
// vérifie la première barrière : qui peut appeler quelles routes.
describe('Routes WhatsApp (unité 45)', () => {
  const reflector = new Reflector();

  it('côté agence : propriétaire et gestionnaire seulement (ni locataire, ni admin)', () => {
    expect(reflector.get(ROLES_KEY, TenantWhatsappController)).toEqual(['OWNER', 'MANAGER']);
  });

  it('espace locataire : locataire seulement', () => {
    expect(reflector.get(ROLES_KEY, MyWhatsappController)).toEqual(['TENANT']);
  });

  it('le locataire agit toujours sur son propre compte (aucun identifiant dans l’adresse)', async () => {
    const consent = { setConsentByTenant: jest.fn().mockResolvedValue({}), generatePinForTenant: jest.fn().mockResolvedValue({ pin: '048213' }) };
    const controller = new MyWhatsappController(consent as never);
    const me = { id: 'tenant-1', role: 'TENANT' } as never;

    await controller.setConsent(me, { action: 'WITHDRAW' });
    await expect(controller.generatePin(me)).resolves.toEqual({ pin: '048213' });

    expect(consent.setConsentByTenant).toHaveBeenCalledWith(me, { action: 'WITHDRAW' });
    expect(consent.generatePinForTenant).toHaveBeenCalledWith(me);
  });
});

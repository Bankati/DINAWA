import { BadRequestException, NotFoundException } from '@nestjs/common';
import { signToken } from '../../common/utils/signed-token';
import { PayLinksService } from './pay-links.service';

const SECRET = 'pay-link-secret';
const FRONTEND = 'https://warahcontact.com';

describe('PayLinksService', () => {
  let prisma: { paymentScheduleEntry: { findUnique: jest.Mock } };
  let payments: { quoteEntry: jest.Mock; initiateForEntry: jest.Mock };
  let service: PayLinksService;

  const config = {
    getOrThrow: (key: string): string => ({ PAY_LINK_SECRET: SECRET, FRONTEND_URL: FRONTEND })[key] ?? '',
  };
  const inDays = (days: number): Date => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const tokenFor = (entryId: string, expiresAt = inDays(10), purpose = 'pay-link'): string =>
    signToken({ purpose: purpose as 'pay-link', data: { e: entryId }, expiresAt }, SECRET);

  const entry = {
    id: 'entry-1',
    leaseId: 'lease-1',
    expectedAmount: 75_000,
    paidAmount: 25_000,
    dueDate: new Date('2026-10-05T00:00:00Z'),
    periodStart: new Date('2026-10-01T00:00:00Z'),
    periodEnd: new Date('2026-10-31T00:00:00Z'),
    payments: [],
    lease: {
      tenantUserId: 'tenant-1',
      tenant: { firstName: 'Ama' },
      property: {
        id: 'prop-1',
        type: 'APARTMENT',
        building: 'Résidence Les Palmiers',
        address: '12 rue des Cocotiers',
        neighborhood: 'Bè',
        city: 'Lomé',
        ownerId: 'owner-1',
      },
    },
  };

  beforeEach(() => {
    prisma = { paymentScheduleEntry: { findUnique: jest.fn().mockResolvedValue(entry) } };
    payments = {
      quoteEntry: jest
        .fn()
        .mockResolvedValue({ rentAmount: 50_000, feeAmount: 750, totalAmount: 50_750, payoutReady: true }),
      initiateForEntry: jest.fn().mockResolvedValue({ paymentId: 'pay-1', checkoutUrl: 'https://paydunya/checkout' }),
    };
    service = new PayLinksService(prisma as never, config as never, payments as never);
  });

  describe('createPayLink', () => {
    it('fabrique un lien /payer valable jusqu’à l’échéance + 30 jours', async () => {
      prisma.paymentScheduleEntry.findUnique.mockResolvedValueOnce({ id: 'entry-1', dueDate: inDays(5) });

      const url = await service.createPayLink('entry-1');

      expect(url.startsWith(`${FRONTEND}/payer/`)).toBe(true);
      const token = url.slice(`${FRONTEND}/payer/`.length);
      const view = await service.getView(token);
      expect(view.status).toBe('PAYABLE');
    });

    it('refuse une échéance inexistante', async () => {
      prisma.paymentScheduleEntry.findUnique.mockResolvedValueOnce(null);
      await expect(service.createPayLink('absente')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getView', () => {
    it('n’expose que les informations minimales du loyer (ni nom de famille, ni téléphone, ni adresse)', async () => {
      const view = await service.getView(tokenFor('entry-1'));

      expect(view).toMatchObject({
        status: 'PAYABLE',
        paymentInProgress: false,
        tenantFirstName: 'Ama',
        propertyType: 'APARTMENT',
        building: 'Résidence Les Palmiers',
        neighborhood: 'Bè',
        city: 'Lomé',
        rentAmount: 50_000,
        feeAmount: 750,
        totalAmount: 50_750,
      });
      const exposed = JSON.stringify(view);
      expect(exposed).not.toContain('12 rue des Cocotiers');
      expect(exposed).not.toContain('owner-1');
      expect(exposed).not.toContain('tenant-1');
      expect(Object.keys(view)).not.toEqual(expect.arrayContaining(['address', 'lastName', 'phone']));
    });

    it('indique PAID quand il ne reste rien à payer', async () => {
      payments.quoteEntry.mockResolvedValueOnce({ rentAmount: 0, feeAmount: 0, totalAmount: 0, payoutReady: true });
      await expect(service.getView(tokenFor('entry-1'))).resolves.toMatchObject({ status: 'PAID' });
    });

    it('indique UNAVAILABLE quand le responsable n’a pas de numéro de reversement', async () => {
      payments.quoteEntry.mockResolvedValueOnce({
        rentAmount: 50_000,
        feeAmount: 750,
        totalAmount: 50_750,
        payoutReady: false,
      });
      await expect(service.getView(tokenFor('entry-1'))).resolves.toMatchObject({ status: 'UNAVAILABLE' });
    });

    it('signale un paiement déjà ouvert pour ce loyer', async () => {
      prisma.paymentScheduleEntry.findUnique.mockResolvedValueOnce({ ...entry, payments: [{ id: 'pay-1' }] });
      await expect(service.getView(tokenFor('entry-1'))).resolves.toMatchObject({ paymentInProgress: true });
    });

    it('refuse un lien expiré', async () => {
      await expect(service.getView(tokenFor('entry-1', inDays(-1)))).rejects.toThrow(
        'Lien expiré, demandez-en un nouveau',
      );
    });

    it.each([
      ['falsifié', `${tokenFor('entry-1').split('.')[0]}.fausse-signature`],
      ['émis pour un autre usage', tokenFor('entry-1', inDays(10), 'autre')],
      ['vide', ''],
    ])('refuse un lien %s', async (_label, token) => {
      await expect(service.getView(token)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('répond « Lien invalide » (sans confirmer son existence) pour une échéance supprimée', async () => {
      prisma.paymentScheduleEntry.findUnique.mockResolvedValueOnce(null);
      await expect(service.getView(tokenFor('entry-1'))).rejects.toThrow('Lien invalide');
    });
  });

  describe('initiate', () => {
    it('lance le paiement de l’échéance du jeton avec un retour vers les pages publiques', async () => {
      const token = tokenFor('entry-1');

      await expect(service.initiate(token, 'FLOOZ')).resolves.toEqual({
        checkoutUrl: 'https://paydunya/checkout',
      });
      expect(payments.initiateForEntry).toHaveBeenCalledWith('entry-1', {
        paymentMethod: 'FLOOZ',
        returnUrl: `${FRONTEND}/payer/${token}/merci`,
        cancelUrl: `${FRONTEND}/payer/${token}?paiement=annule`,
      });
    });

    it('ne lance aucun paiement avec un lien invalide', async () => {
      await expect(service.initiate('invalide', 'TMONEY')).rejects.toBeInstanceOf(BadRequestException);
      expect(payments.initiateForEntry).not.toHaveBeenCalled();
    });

    it('ne renvoie pas l’identifiant interne du paiement', async () => {
      const result = await service.initiate(tokenFor('entry-1'), 'TMONEY');
      expect(Object.keys(result)).toEqual(['checkoutUrl']);
    });
  });
});

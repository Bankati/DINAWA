import { WhatsappAccessService } from './whatsapp-access.service';

describe('WhatsappAccessService.canUseWhatsapp', () => {
  let prisma: {
    user: { findUnique: jest.Mock };
    lease: { findFirst: jest.Mock };
    mandate: { findFirst: jest.Mock };
    subscription: { findUnique: jest.Mock };
  };
  let config: { get: jest.Mock };
  let platformSettings: { whatsappEnabledTiers: jest.Mock };
  let service: WhatsappAccessService;

  const property = { id: 'prop-1', ownerId: 'owner-1' };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          phone: '90112233',
          whatsappPhone: null,
          whatsappConsent: 'ACCEPTED',
        }),
      },
      lease: { findFirst: jest.fn().mockResolvedValue({ id: 'lease-1', property }) },
      mandate: { findFirst: jest.fn().mockResolvedValue(null) },
      subscription: { findUnique: jest.fn().mockResolvedValue({ tier: 'STARTER' }) },
    };
    config = { get: jest.fn().mockReturnValue(true) };
    platformSettings = {
      whatsappEnabledTiers: jest.fn().mockResolvedValue(['STARTER', 'PRO', 'PREMIUM']),
    };
    service = new WhatsappAccessService(prisma as never, config as never, platformSettings as never);
  });

  it('autorise un locataire consentant, avec numéro et forfait inclus', async () => {
    await expect(service.canUseWhatsapp('tenant-1')).resolves.toEqual({
      allowed: true,
      recipientPhone: '90112233',
      metaNumber: '22890112233',
    });
  });

  it('préfère le numéro WhatsApp dédié au numéro principal', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      phone: '90112233',
      whatsappPhone: '99445566',
      whatsappConsent: 'ACCEPTED',
    });
    await expect(service.canUseWhatsapp('tenant-1')).resolves.toMatchObject({
      recipientPhone: '99445566',
      metaNumber: '22899445566',
    });
  });

  it('refuse quand l’interrupteur général est éteint, sans lire la base', async () => {
    config.get.mockReturnValue(false);
    await expect(service.canUseWhatsapp('tenant-1')).resolves.toEqual({
      allowed: false,
      reason: 'CHANNEL_DISABLED',
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it.each(['NOT_ASKED', 'STOPPED'])('refuse sans consentement accepté (%s)', async (consent) => {
    prisma.user.findUnique.mockResolvedValueOnce({
      phone: '90112233',
      whatsappPhone: null,
      whatsappConsent: consent,
    });
    await expect(service.canUseWhatsapp('tenant-1')).resolves.toEqual({
      allowed: false,
      reason: 'NO_CONSENT',
    });
  });

  it('refuse un numéro inexploitable', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      phone: null,
      whatsappPhone: null,
      whatsappConsent: 'ACCEPTED',
    });
    await expect(service.canUseWhatsapp('tenant-1')).resolves.toMatchObject({
      reason: 'NO_VALID_NUMBER',
    });
  });

  it('refuse sans bail actif', async () => {
    prisma.lease.findFirst.mockResolvedValueOnce(null);
    await expect(service.canUseWhatsapp('tenant-1')).resolves.toMatchObject({
      reason: 'NO_ACTIVE_LEASE',
    });
  });

  it('regarde le forfait du gestionnaire quand un mandat est actif, pas celui du propriétaire', async () => {
    prisma.mandate.findFirst.mockResolvedValueOnce({ managerId: 'manager-1' });
    platformSettings.whatsappEnabledTiers.mockResolvedValueOnce(['PRO']);
    prisma.subscription.findUnique.mockResolvedValueOnce({ tier: 'PRO' });

    await expect(service.canUseWhatsapp('tenant-1')).resolves.toMatchObject({ allowed: true });
    expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
      where: { userId: 'manager-1' },
      select: { tier: true },
    });
  });

  it('refuse quand le forfait du responsable n’est pas coché par l’admin', async () => {
    platformSettings.whatsappEnabledTiers.mockResolvedValueOnce(['PRO', 'PREMIUM']);
    await expect(service.canUseWhatsapp('tenant-1')).resolves.toEqual({
      allowed: false,
      reason: 'TIER_NOT_INCLUDED',
    });
  });

  it('prend le forfait Starter par défaut quand le responsable n’a pas de ligne d’abonnement', async () => {
    prisma.subscription.findUnique.mockResolvedValueOnce(null);
    platformSettings.whatsappEnabledTiers.mockResolvedValueOnce(['PRO']);
    await expect(service.canUseWhatsapp('tenant-1')).resolves.toMatchObject({
      reason: 'TIER_NOT_INCLUDED',
    });
  });
});

describe('WhatsappAccessService.canSendStopConfirmation (unité 44)', () => {
  let prisma: { user: { findUnique: jest.Mock } };
  let config: { get: jest.Mock };
  let service: WhatsappAccessService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ phone: '90112233', whatsappPhone: null, whatsappConsent: 'STOPPED' }),
      },
    };
    config = { get: jest.fn().mockReturnValue(true) };
    service = new WhatsappAccessService(prisma as never, config as never, {} as never);
  });

  it('autorise la confirmation pour un locataire qui vient de passer à STOPPED, sans bail ni forfait', async () => {
    await expect(service.canSendStopConfirmation('tenant-1')).resolves.toEqual({
      allowed: true,
      recipientPhone: '90112233',
      metaNumber: '22890112233',
    });
  });

  it('respecte l’interrupteur général', async () => {
    config.get.mockReturnValue(false);
    await expect(service.canSendStopConfirmation('tenant-1')).resolves.toEqual({
      allowed: false,
      reason: 'CHANNEL_DISABLED',
    });
  });

  it.each(['ACCEPTED', 'NOT_ASKED'])('refuse si le consentement est %s (garde-fou)', async (consent) => {
    prisma.user.findUnique.mockResolvedValue({ phone: '90112233', whatsappPhone: null, whatsappConsent: consent });
    await expect(service.canSendStopConfirmation('tenant-1')).resolves.toMatchObject({ reason: 'NO_CONSENT' });
  });

  it('exige un numéro exploitable', async () => {
    prisma.user.findUnique.mockResolvedValue({ phone: null, whatsappPhone: null, whatsappConsent: 'STOPPED' });
    await expect(service.canSendStopConfirmation('tenant-1')).resolves.toMatchObject({ reason: 'NO_VALID_NUMBER' });
  });

  it('préfère le numéro WhatsApp dédié', async () => {
    prisma.user.findUnique.mockResolvedValue({ phone: '90112233', whatsappPhone: '99887766', whatsappConsent: 'STOPPED' });
    await expect(service.canSendStopConfirmation('tenant-1')).resolves.toMatchObject({ metaNumber: '22899887766' });
  });
});

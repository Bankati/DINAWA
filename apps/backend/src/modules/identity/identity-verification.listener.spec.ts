import { IdentityVerificationListener } from './identity-verification.listener';
import { IdentityVerificationRequestedEvent } from './identity-verification.events';

describe('IdentityVerificationListener', () => {
  let listener: IdentityVerificationListener;
  let prisma: {
    identityVerification: { update: jest.Mock };
    ownerProfile: { update: jest.Mock };
    tenantProfile: { update: jest.Mock };
    managerProfile: { update: jest.Mock };
  };
  let ocr: { verifyFront: jest.Mock; verifyBack: jest.Mock };

  const event: IdentityVerificationRequestedEvent = {
    verificationId: 'verif-1',
    userId: 'user-owner',
    userRole: 'OWNER',
    imageBuffer: Buffer.from('image-bytes'),
    imageBackBuffer: Buffer.from('image-back-bytes'),
  };

  const emptyBack = {
    rawText: '',
    emergencyContactRaw: null,
    emergencyContactPhone: null,
    mrzChecksumValid: null,
  };

  beforeEach(() => {
    prisma = {
      identityVerification: { update: jest.fn().mockResolvedValue({}) },
      ownerProfile: { update: jest.fn().mockResolvedValue({}) },
      tenantProfile: { update: jest.fn().mockResolvedValue({}) },
      managerProfile: { update: jest.fn().mockResolvedValue({}) },
    };
    ocr = {
      verifyFront: jest.fn().mockResolvedValue({ status: 'VERIFIED', rawText: 'texte ocr recto' }),
      verifyBack: jest.fn().mockResolvedValue(emptyBack),
    };

    listener = new IdentityVerificationListener(prisma as never, ocr);
  });

  it("persiste VERIFIED et met à jour OwnerProfile quand l'OCR recto réussit", async () => {
    await listener.handle(event);

    expect(prisma.identityVerification.update).toHaveBeenCalledWith({
      where: { id: 'verif-1' },
      data: {
        status: 'VERIFIED',
        reason: undefined,
        rawText: 'texte ocr recto',
        rawTextBack: '',
        emergencyContactRaw: null,
        emergencyContactPhone: null,
        mrzChecksumValid: null,
      },
    });
    expect(prisma.ownerProfile.update).toHaveBeenCalledWith({
      where: { userId: 'user-owner' },
      data: { idVerificationStatus: 'VERIFIED' },
    });
  });

  it('enrichit la ligne avec les champs verso (personne à prévenir, MRZ) sans changer la décision recto', async () => {
    ocr.verifyBack.mockResolvedValue({
      rawText: 'texte ocr verso',
      emergencyContactRaw: 'TESTA,TESTVILLE,90000000',
      emergencyContactPhone: '90000000',
      mrzChecksumValid: true,
    });

    await listener.handle(event);

    expect(prisma.identityVerification.update).toHaveBeenCalledWith({
      where: { id: 'verif-1' },
      data: {
        status: 'VERIFIED',
        reason: undefined,
        rawText: 'texte ocr recto',
        rawTextBack: 'texte ocr verso',
        emergencyContactRaw: 'TESTA,TESTVILLE,90000000',
        emergencyContactPhone: '90000000',
        mrzChecksumValid: true,
      },
    });
  });

  it('reste VERIFIED même si le verso est illisible (jamais un gate)', async () => {
    ocr.verifyBack.mockRejectedValue(new Error('verso illisible'));

    await listener.handle(event);

    const [args] = prisma.identityVerification.update.mock.calls[0] as [
      { data: { status: string } },
    ];
    expect(args.data.status).toBe('VERIFIED');
    expect(prisma.ownerProfile.update).toHaveBeenCalledWith({
      where: { userId: 'user-owner' },
      data: { idVerificationStatus: 'VERIFIED' },
    });
  });

  it("bascule le verso en champs vides (jamais une exception qui remonte) quand l'OCR verso dépasse 40 secondes", async () => {
    jest.useFakeTimers();
    ocr.verifyBack.mockImplementation(() => new Promise(() => {}));

    const promise = listener.handle(event);
    await jest.advanceTimersByTimeAsync(40_000);
    await promise;

    const [args] = prisma.identityVerification.update.mock.calls[0] as [
      { data: { status: string; rawTextBack: string; emergencyContactRaw: string | null } },
    ];
    expect(args.data.rawTextBack).toBe('');
    expect(args.data.emergencyContactRaw).toBeNull();
    expect(args.data.status).toBe('VERIFIED');
    jest.useRealTimers();
  });

  it('met à jour TenantProfile pour un locataire', async () => {
    await listener.handle({ ...event, userId: 'user-tenant', userRole: 'TENANT' });
    expect(prisma.tenantProfile.update).toHaveBeenCalledWith({
      where: { userId: 'user-tenant' },
      data: { idVerificationStatus: 'VERIFIED' },
    });
  });

  it('met à jour ManagerProfile pour un gestionnaire', async () => {
    await listener.handle({ ...event, userId: 'user-manager', userRole: 'MANAGER' });
    expect(prisma.managerProfile.update).toHaveBeenCalledWith({
      where: { userId: 'user-manager' },
      data: { idVerificationStatus: 'VERIFIED' },
    });
  });

  it("persiste REJECTED avec le motif quand l'OCR recto rejette", async () => {
    ocr.verifyFront.mockResolvedValue({
      status: 'REJECTED',
      reason: 'Marqueurs manquants',
      rawText: 'x',
    });

    await listener.handle(event);

    const [args] = prisma.identityVerification.update.mock.calls[0] as [
      { data: { status: string; reason: string; rawText: string } },
    ];
    expect(args.data.status).toBe('REJECTED');
    expect(args.data.reason).toBe('Marqueurs manquants');
    expect(args.data.rawText).toBe('x');
    expect(prisma.ownerProfile.update).toHaveBeenCalledWith({
      where: { userId: 'user-owner' },
      data: { idVerificationStatus: 'REJECTED' },
    });
  });

  it("bascule en REJECTED (motif technique) quand l'OCR recto dépasse 40 secondes", async () => {
    jest.useFakeTimers();
    ocr.verifyFront.mockImplementation(() => new Promise(() => {}));

    const promise = listener.handle(event);
    await jest.advanceTimersByTimeAsync(40_000);
    await promise;

    const [args] = prisma.identityVerification.update.mock.calls[0] as [
      { data: { status: string; reason: string; rawText: string } },
    ];
    expect(args.data).toMatchObject({
      status: 'REJECTED',
      reason: 'Délai de traitement dépassé, veuillez réessayer',
      rawText: '',
    });
    jest.useRealTimers();
  });

  it("bascule en REJECTED (erreur technique) quand l'OCR recto lève une exception inattendue", async () => {
    ocr.verifyFront.mockRejectedValue(new Error('tesseract crash'));

    await listener.handle(event);

    const [args] = prisma.identityVerification.update.mock.calls[0] as [
      { data: { status: string; reason: string; rawText: string } },
    ];
    expect(args.data).toMatchObject({
      status: 'REJECTED',
      reason: 'Erreur technique pendant la vérification, veuillez réessayer',
      rawText: '',
    });
  });

  it('ne lève jamais même si la synchronisation du profil échoue', async () => {
    prisma.ownerProfile.update.mockRejectedValue(new Error('profil introuvable'));

    await expect(listener.handle(event)).resolves.toBeUndefined();
    expect(prisma.identityVerification.update).toHaveBeenCalled();
  });
});

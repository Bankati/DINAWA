import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IdentityService, IdentityVerificationFiles } from './identity.service';
import { IDENTITY_VERIFICATION_REQUESTED } from './identity-verification.events';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';

describe('IdentityService', () => {
  let service: IdentityService;
  let prisma: {
    identityVerification: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  };
  let storage: { upload: jest.Mock };
  let events: { emit: jest.Mock };

  const owner = { id: 'user-owner', role: 'OWNER' } as AuthenticatedUser;
  const frontFile = {
    buffer: Buffer.from('front-image-bytes'),
    mimetype: 'image/jpeg',
    size: 1_000,
  } as Express.Multer.File;
  const backFile = {
    buffer: Buffer.from('back-image-bytes'),
    mimetype: 'image/jpeg',
    size: 1_000,
  } as Express.Multer.File;
  const files: IdentityVerificationFiles = { image: [frontFile], imageBack: [backFile] };

  beforeEach(() => {
    prisma = {
      identityVerification: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'verif-1', status: 'PENDING' }),
        update: jest.fn().mockResolvedValue({ id: 'verif-1', status: 'PENDING' }),
      },
    };
    storage = { upload: jest.fn().mockResolvedValue('path') };
    events = { emit: jest.fn() };

    service = new IdentityService(prisma as never, storage as never, events as never);
  });

  it("upload le recto ET le verso, crée une ligne PENDING et émet l'événement de traitement", async () => {
    const result = await service.verify(owner, files);

    expect(storage.upload).toHaveBeenCalledTimes(2);
    const [firstCall, secondCall] = storage.upload.mock.calls as [string, string, Buffer, string][];
    expect(firstCall[0]).toBe('id-documents');
    expect(firstCall[2]).toBe(frontFile.buffer);
    expect(secondCall[0]).toBe('id-documents');
    expect(secondCall[2]).toBe(backFile.buffer);

    const frontPath = firstCall[1];
    const backPath = secondCall[1];
    expect(frontPath).toContain(owner.id);
    expect(backPath).toContain(owner.id);
    expect(frontPath).not.toBe(backPath);

    expect(prisma.identityVerification.create).toHaveBeenCalledWith({
      data: {
        userId: owner.id,
        storagePath: frontPath,
        storagePathBack: backPath,
        status: 'PENDING',
      },
    });
    expect(events.emit).toHaveBeenCalledWith(IDENTITY_VERIFICATION_REQUESTED, {
      verificationId: 'verif-1',
      userId: owner.id,
      userRole: 'OWNER',
      imageBuffer: frontFile.buffer,
      imageBackBuffer: backFile.buffer,
    });
    expect(result).toEqual({ id: 'verif-1', status: 'PENDING' });
  });

  it('rejette avec 400 pour un compte ADMIN (pas de vérification CNI), sans toucher au stockage', async () => {
    await expect(
      service.verify({ id: 'user-admin', role: 'ADMIN' } as AuthenticatedUser, files),
    ).rejects.toThrow(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('rejette avec 409 quand une vérification récente est déjà en cours pour cet utilisateur', async () => {
    prisma.identityVerification.findFirst.mockResolvedValue({
      id: 'verif-old',
      updatedAt: new Date(),
    });

    await expect(service.verify(owner, files)).rejects.toThrow(ConflictException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('réutilise une ligne PENDING abandonnée (plus vieille que 20s) et réinitialise les champs verso', async () => {
    prisma.identityVerification.findFirst.mockResolvedValue({
      id: 'verif-stale',
      updatedAt: new Date(Date.now() - 30_000),
    });

    const result = await service.verify(owner, files);

    expect(prisma.identityVerification.create).not.toHaveBeenCalled();
    type UpdateArgs = {
      where: { id: string };
      data: { status: string; rawTextBack: null; emergencyContactRaw: null };
    };
    const [updateArgs] = prisma.identityVerification.update.mock.calls[0] as [UpdateArgs];
    expect(updateArgs.where).toEqual({ id: 'verif-stale' });
    expect(updateArgs.data.status).toBe('PENDING');
    expect(updateArgs.data.rawTextBack).toBeNull();
    expect(updateArgs.data.emergencyContactRaw).toBeNull();
    expect(result).toEqual({ id: 'verif-1', status: 'PENDING' });
  });

  it('convertit une violation de contrainte unique (P2002) en 409 (course avec une autre requête)', async () => {
    prisma.identityVerification.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.22.0',
      }),
    );

    await expect(service.verify(owner, files)).rejects.toThrow(ConflictException);
  });

  it("rejette avec 400 quand l'image du recto est absente", async () => {
    await expect(service.verify(owner, { imageBack: [backFile] })).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.identityVerification.findFirst).not.toHaveBeenCalled();
  });

  it("rejette avec 400 quand l'image du verso est absente", async () => {
    await expect(service.verify(owner, { image: [frontFile] })).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.identityVerification.findFirst).not.toHaveBeenCalled();
  });

  it('rejette avec 400 quand une des deux images dépasse la taille maximale', async () => {
    const tooLarge = { ...backFile, size: 10 * 1024 * 1024 };
    await expect(
      service.verify(owner, { image: [frontFile], imageBack: [tooLarge] }),
    ).rejects.toThrow(BadRequestException);
  });

  it("getLatestStatus renvoie la dernière vérification pour l'utilisateur", async () => {
    prisma.identityVerification.findFirst.mockResolvedValue({ id: 'verif-2', status: 'REJECTED' });

    const result = await service.getLatestStatus('user-owner');

    expect(prisma.identityVerification.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-owner' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual({ id: 'verif-2', status: 'REJECTED' });
  });
});

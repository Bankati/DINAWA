import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../types/authenticated-user.type';
import { assertIdentityVerified } from './identity-verified';

describe('assertIdentityVerified', () => {
  let prisma: {
    ownerProfile: { findUnique: jest.Mock };
    managerProfile: { findUnique: jest.Mock };
  };

  const owner = { id: 'owner-1', role: 'OWNER' } as AuthenticatedUser;
  const manager = { id: 'manager-1', role: 'MANAGER' } as AuthenticatedUser;
  const admin = { id: 'admin-1', role: 'ADMIN' } as AuthenticatedUser;

  beforeEach(() => {
    prisma = {
      ownerProfile: { findUnique: jest.fn() },
      managerProfile: { findUnique: jest.fn() },
    };
  });

  it('ne lève rien si OWNER a idVerificationStatus=VERIFIED', async () => {
    prisma.ownerProfile.findUnique.mockResolvedValueOnce({ idVerificationStatus: 'VERIFIED' });
    await expect(assertIdentityVerified(prisma as never, owner)).resolves.toBeUndefined();
  });

  it('ne lève rien si MANAGER a idVerificationStatus=VERIFIED', async () => {
    prisma.managerProfile.findUnique.mockResolvedValueOnce({ idVerificationStatus: 'VERIFIED' });
    await expect(assertIdentityVerified(prisma as never, manager)).resolves.toBeUndefined();
  });

  it('lève ForbiddenException si OWNER a idVerificationStatus=PENDING (jamais soumis ou en cours)', async () => {
    prisma.ownerProfile.findUnique.mockResolvedValueOnce({ idVerificationStatus: 'PENDING' });
    await expect(assertIdentityVerified(prisma as never, owner)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('lève ForbiddenException si MANAGER a idVerificationStatus=REJECTED', async () => {
    prisma.managerProfile.findUnique.mockResolvedValueOnce({ idVerificationStatus: 'REJECTED' });
    await expect(assertIdentityVerified(prisma as never, manager)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('interroge managerProfile (jamais ownerProfile) pour un MANAGER, et inversement', async () => {
    prisma.managerProfile.findUnique.mockResolvedValueOnce({ idVerificationStatus: 'VERIFIED' });
    await assertIdentityVerified(prisma as never, manager);
    expect(prisma.managerProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: manager.id },
    });
    expect(prisma.ownerProfile.findUnique).not.toHaveBeenCalled();
  });

  it('ne lève jamais rien pour ADMIN, sans même interroger la base', async () => {
    await expect(assertIdentityVerified(prisma as never, admin)).resolves.toBeUndefined();
    expect(prisma.ownerProfile.findUnique).not.toHaveBeenCalled();
    expect(prisma.managerProfile.findUnique).not.toHaveBeenCalled();
  });
});

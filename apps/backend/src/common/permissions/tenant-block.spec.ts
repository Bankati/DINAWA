import { ForbiddenException } from '@nestjs/common';
import { assertTenantNotBlocked } from './tenant-block';

describe('assertTenantNotBlocked', () => {
  let prisma: { tenantPropertyBlock: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = { tenantPropertyBlock: { findUnique: jest.fn() } };
  });

  it("ne lève rien si aucun blocage n'existe pour ce couple (bien, locataire)", async () => {
    prisma.tenantPropertyBlock.findUnique.mockResolvedValueOnce(null);
    await expect(
      assertTenantNotBlocked(prisma as never, 'prop-1', 'tenant-1'),
    ).resolves.toBeUndefined();
  });

  it('lève ForbiddenException avec le motif si un blocage existe', async () => {
    prisma.tenantPropertyBlock.findUnique.mockResolvedValue({
      id: 'block-1',
      reason: 'Dégâts constatés',
    });
    await expect(assertTenantNotBlocked(prisma as never, 'prop-1', 'tenant-1')).rejects.toThrow(
      ForbiddenException,
    );
    await expect(assertTenantNotBlocked(prisma as never, 'prop-1', 'tenant-1')).rejects.toThrow(
      /Dégâts constatés/,
    );
  });

  it('interroge par la clé composite (propertyId, tenantUserId), jamais un scope plus large', async () => {
    prisma.tenantPropertyBlock.findUnique.mockResolvedValueOnce(null);
    await assertTenantNotBlocked(prisma as never, 'prop-1', 'tenant-1');
    expect(prisma.tenantPropertyBlock.findUnique).toHaveBeenCalledWith({
      where: { propertyId_tenantUserId: { propertyId: 'prop-1', tenantUserId: 'tenant-1' } },
    });
  });
});

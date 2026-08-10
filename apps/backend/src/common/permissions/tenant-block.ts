import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Autorité unique pour vérifier qu'un locataire n'est pas bloqué sur un bien
// précis (voir build-plan.md unité 14, /architect). Le blocage est scopé à
// (propertyId, tenantUserId) — jamais global au compte, jamais à l'échelle
// du propriétaire. Un locataire bloqué sur un bien reste invitable par le
// même propriétaire pour un autre bien, ou par n'importe quel autre
// propriétaire. Jamais de vérification inline ailleurs dans le code métier.
export async function assertTenantNotBlocked(
  prisma: PrismaService,
  propertyId: string,
  tenantUserId: string,
): Promise<void> {
  const block = await prisma.tenantPropertyBlock.findUnique({
    where: { propertyId_tenantUserId: { propertyId, tenantUserId } },
  });
  if (block) {
    throw new ForbiddenException(`Ce locataire a été bloqué pour ce bien. Motif : ${block.reason}`);
  }
}

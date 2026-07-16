import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-user.type';

// Autorité unique pour vérifier qu'un OWNER ou MANAGER a une CNI VERIFIED
// avant une action qui compte réellement — voir /architect révision
// inscription owner/manager. La CNI est facultative à l'inscription
// (voir AuthService.signupOwner/signupManager) ; ce verrou est le seul
// endroit où la vérification devient bloquante, au moment de créer un bien.
// Jamais de vérification inline ailleurs dans le code métier.
export async function assertIdentityVerified(
  prisma: PrismaService,
  user: AuthenticatedUser,
): Promise<void> {
  if (user.role === 'ADMIN') return;

  const status =
    user.role === 'OWNER'
      ? (await prisma.ownerProfile.findUnique({ where: { userId: user.id } }))?.idVerificationStatus
      : (await prisma.managerProfile.findUnique({ where: { userId: user.id } }))
          ?.idVerificationStatus;

  if (status !== 'VERIFIED') {
    throw new ForbiddenException(
      "Vérifiez votre identité (pièce d'identité) avant de créer un bien — voir POST /api/identity/verify",
    );
  }
}

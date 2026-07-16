import { UserRole } from '@prisma/client';

export const IDENTITY_VERIFICATION_REQUESTED = 'identity.verification.requested';

// Émis par IdentityService une fois l'image uploadée et la ligne PENDING
// créée — jamais de logique métier dans l'événement lui-même, seulement le
// découplage de l'OCR (invariant #15) hors du request handler.
export type IdentityVerificationRequestedEvent = {
  verificationId: string;
  userId: string;
  userRole: Exclude<UserRole, 'ADMIN'>;
  imageBuffer: Buffer;
  imageBackBuffer: Buffer;
};

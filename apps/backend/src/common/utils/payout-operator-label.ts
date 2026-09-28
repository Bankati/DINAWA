import { PayoutOperator } from '@prisma/client';

// Libellé lisible d'un opérateur mobile money — utilisé partout où un envoi
// ou un changement de numéro de réception est notifié (voir PayoutsService,
// ProfileService, /architect reversement 2026-09-25).
export const PAYOUT_OPERATOR_LABEL: Record<PayoutOperator, string> = {
  TMONEY: 'T-Money',
  FLOOZ: 'Flooz',
};

import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

// Initialisation d'un paiement PayDunya par le locataire (voir build-plan.md
// unité 17, adaptée à PayDunya — /architect 2026-09-07). Contrairement à la
// saisie manuelle, aucun montant n'est saisi ici : le solde restant de
// l'échéance est calculé côté serveur (voir PaymentsService.initiate()).
const PAYDUNYA_PAYMENT_METHODS = ['TMONEY', 'FLOOZ'] as const;
export type PaydunyaPaymentMethod = (typeof PAYDUNYA_PAYMENT_METHODS)[number];

export class InitiatePaymentDto {
  @ApiProperty()
  @IsString()
  scheduleEntryId!: string;

  // Préférence indicative pour nos propres statistiques/affichage — ne
  // restreint pas le choix de l'opérateur sur la page PayDunya (Checkout
  // Invoice ne permet pas d'imposer un opérateur, voir PaydunyaService).
  // Constaté en /review 2026-09-07, assumé plutôt que corrigé (nécessiterait
  // le flux Softpay, non documenté avec certitude).
  @ApiProperty({
    enum: PAYDUNYA_PAYMENT_METHODS,
    description: 'Préférence indicative — ne restreint pas le choix réel sur la page PayDunya',
  })
  @IsIn(PAYDUNYA_PAYMENT_METHODS)
  paymentMethod!: PaydunyaPaymentMethod;
}

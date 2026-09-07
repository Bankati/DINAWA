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

  @ApiProperty({ enum: PAYDUNYA_PAYMENT_METHODS })
  @IsIn(PAYDUNYA_PAYMENT_METHODS)
  paymentMethod!: PaydunyaPaymentMethod;
}

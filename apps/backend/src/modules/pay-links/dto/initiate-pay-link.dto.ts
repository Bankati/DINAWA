import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  PAYDUNYA_PAYMENT_METHODS,
  PaydunyaPaymentMethod,
} from '../../payments/dto/initiate-payment.dto';

// Lancement d'un paiement depuis le lien public (unité 43). Aucun montant :
// le solde restant est toujours calculé côté serveur, comme pour le paiement
// depuis l'espace locataire.
export class InitiatePayLinkDto {
  @ApiProperty({
    enum: PAYDUNYA_PAYMENT_METHODS,
    description: 'Préférence indicative — ne restreint pas le choix réel sur la page PayDunya',
  })
  @IsIn(PAYDUNYA_PAYMENT_METHODS)
  paymentMethod!: PaydunyaPaymentMethod;
}

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PAYMENT_CONFIRMED, PaymentConfirmedEvent } from '../payments/payment.events';
import { PayoutsService } from './payouts.service';

// Déclenche le reversement dès qu'un paiement PayDunya est confirmé, hors de
// la requête/du webhook qui l'a confirmé (invariant #6 : jamais de logique
// aval directement dans PaymentsService). Si l'événement se perd (crash entre
// la confirmation et ici), PayoutsTask crée le Payout manquant au passage
// suivant — le loyer n'est jamais oublié.
@Injectable()
export class PayoutConfirmedListener {
  private readonly logger = new Logger(PayoutConfirmedListener.name);

  constructor(private readonly payouts: PayoutsService) {}

  @OnEvent(PAYMENT_CONFIRMED, { async: true, promisify: true })
  async handle(event: PaymentConfirmedEvent): Promise<void> {
    try {
      const payout = await this.payouts.createForPayment(event.paymentId);
      if (payout) await this.payouts.process(payout.id);
    } catch (error) {
      this.logger.error(`[payouts] échec pour paiement=${event.paymentId}`, error);
    }
  }
}

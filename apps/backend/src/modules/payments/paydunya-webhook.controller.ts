import { Controller, HttpCode, Post, Query } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

// Endpoint IPN PayDunya (voir /architect 2026-09-07, build-plan.md unité 18
// adaptée à PayDunya). Public par nature — PayDunya nous appelle depuis
// l'extérieur, sans JWT WARAH. Exclu de Swagger (pas un endpoint destiné à
// être appelé par notre frontend). Le payload brut est déjà tracé par
// AuditLogInterceptor (global, toute requête mutante) — inutile de le
// reloguer ici. Hors rate limit (@SkipThrottle) — même invariant documenté
// dans architecture.md dès la conception initiale : un webhook de paiement
// ne doit jamais être artificiellement throttlé (retard de confirmation
// visible pour le locataire, rattrapable seulement 15 min plus tard par le
// cron de réconciliation).
@ApiExcludeController()
@SkipThrottle()
@Controller('payments/webhooks')
export class PaydunyaWebhookController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Public()
  @Post('paydunya')
  @HttpCode(200)
  // Pur dispatcher — toute la logique (réponse 200 systématique, gestion
  // d'erreur, logging) vit dans les services, jamais ici (voir /review
  // abonnements, 2026-10-01). Paramètre distinct (pas un préfixe sur
  // paymentId) — voir /architect abonnements, 2026-09-30 : zéro risque sur
  // le flux loyer existant.
  handle(
    @Query('paymentId') paymentId?: string,
    @Query('subscriptionInvoiceId') subscriptionInvoiceId?: string,
  ): Promise<{ status: string }> {
    if (subscriptionInvoiceId) {
      return this.subscriptionsService.handleSubscriptionInvoiceCallback(subscriptionInvoiceId);
    }
    return this.paymentsService.handlePaydunyaCallback(paymentId);
  }
}

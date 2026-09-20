import { Controller, HttpCode, Post, Query } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';

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
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post('paydunya')
  @HttpCode(200)
  handle(@Query('paymentId') paymentId?: string): Promise<{ status: string }> {
    // Réponse 200 dans tous les cas (même paymentId absent/inconnu) — voir
    // build-plan.md unité 18 : ne jamais faire échouer l'accusé de réception
    // PayDunya, un échec de traitement se rattrape via le cron de
    // réconciliation plutôt que par un retry PayDunya qu'on ne contrôle pas.
    return this.paymentsService.handlePaydunyaCallback(paymentId);
  }
}

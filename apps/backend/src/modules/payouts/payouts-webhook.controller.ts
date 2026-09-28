import { Controller, HttpCode, Post, Query } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { PayoutsService } from './payouts.service';

// Callback de l'API PUSH PayDunya (décaissement). Public par nature — PayDunya
// nous appelle depuis l'extérieur, sans JWT — et hors rate limit, comme l'IPN
// de paiement. Le corps n'est jamais cru : `payoutId` vient de la callback_url
// que NOUS avons construite, le statut est revérifié auprès de PayDunya.
@ApiExcludeController()
@SkipThrottle()
@Controller('payouts/webhooks')
export class PayoutsWebhookController {
  constructor(private readonly payouts: PayoutsService) {}

  @Public()
  @Post('paydunya')
  @HttpCode(200)
  handle(@Query('payoutId') payoutId?: string): Promise<{ status: string }> {
    return this.payouts.handleCallback(payoutId);
  }
}

import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { THROTTLE_PAY_LINK_INITIATE } from '../../common/constants';
import { PayLinkThrottled } from '../../common/throttle/pay-link-throttlers';
import { InitiatePayLinkDto } from './dto/initiate-pay-link.dto';
import { PayLinkView, PayLinksService } from './pay-links.service';

// Lien de paiement public (unité 43) — sans connexion par nature : le jeton
// signé de l'URL est la seule autorisation. Portier à deux niveaux (par
// adresse, et par adresse + lien : voir pay-link-throttlers.ts), plus serré
// sur le lancement du paiement. Aucune logique ici (invariant #1).
@ApiTags('pay-links')
@Controller('pay-links')
export class PayLinksController {
  constructor(private readonly payLinks: PayLinksService) {}

  @Public()
  @PayLinkThrottled()
  @Get(':token')
  @ApiOperation({ summary: 'Informations minimales du loyer à payer (page publique /payer)' })
  getView(@Param('token') token: string): Promise<PayLinkView> {
    return this.payLinks.getView(token);
  }

  @Public()
  @PayLinkThrottled()
  @Throttle(THROTTLE_PAY_LINK_INITIATE)
  @Post(':token/initiate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Lance (ou reprend) le paiement PayDunya du loyer — renvoie checkoutUrl' })
  initiate(
    @Param('token') token: string,
    @Body() dto: InitiatePayLinkDto,
  ): Promise<{ checkoutUrl: string }> {
    return this.payLinks.initiate(token, dto.paymentMethod);
  }
}

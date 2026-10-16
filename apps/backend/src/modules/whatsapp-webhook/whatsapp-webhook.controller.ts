import { Controller, Get, Header, Headers, HttpCode, Post, Query, RawBodyRequest, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { SkipAuditLog } from '../../common/decorators/skip-audit-log.decorator';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

// Webhook Meta WhatsApp (unité 44, /architect 2026-10-13). Public par
// nature : Meta s'authentifie par la signature X-Hub-Signature-256, jamais
// par un JWT WARAH. Exclu de Swagger, hors limite de débit (une rafale
// d'accusés Meta est légitime), et hors table d'audit (corps = texte des
// messages des locataires et numéros). Pur dispatcher : toute la logique
// vit dans WhatsappWebhookService.
@ApiExcludeController()
@SkipThrottle()
@Controller('webhooks/whatsapp')
export class WhatsappWebhookController {
  constructor(private readonly webhook: WhatsappWebhookService) {}

  @Public()
  @Get()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  handshake(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ): string {
    return this.webhook.verifyHandshake(mode, token, challenge);
  }

  @Public()
  @Post()
  @HttpCode(200)
  @SkipAuditLog()
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature?: string,
  ): Promise<{ received: true }> {
    await this.webhook.handleNotification(req.rawBody, signature, req.body);
    return { received: true };
  }
}

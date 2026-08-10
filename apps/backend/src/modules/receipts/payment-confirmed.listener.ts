import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { format } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { NotifyService } from '../notify/notify.service';
import { PAYMENT_CONFIRMED, PaymentConfirmedEvent } from '../payments/payment.events';
import { ReceiptPdfService } from './receipt-pdf.service';

// Découple la génération de quittance + notifications de la requête HTTP
// qui confirme le paiement (voir build-plan.md unité 22). Le PDF est généré
// une fois ici, réutilisé pour les deux envois, puis jamais persisté.
@Injectable()
export class PaymentConfirmedListener {
  private readonly logger = new Logger(PaymentConfirmedListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly receiptPdf: ReceiptPdfService,
    private readonly notify: NotifyService,
  ) {}

  @OnEvent(PAYMENT_CONFIRMED, { async: true, promisify: true })
  async handle(event: PaymentConfirmedEvent): Promise<void> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: event.paymentId },
        include: {
          scheduleEntry: true,
          lease: { include: { property: true, owner: true, tenant: true } },
        },
      });
      if (!payment) {
        this.logger.warn(`[payment-confirmed] paiement introuvable id=${event.paymentId}`);
        return;
      }

      const pdf = await this.receiptPdf.generate(payment);
      const period = `${format(payment.scheduleEntry.periodStart, 'dd/MM/yyyy')} — ${format(payment.scheduleEntry.periodEnd, 'dd/MM/yyyy')}`;
      const variables = { period, amount: payment.paidAmount };
      const emailAttachments = [{ filename: 'quittance-warah.pdf', content: pdf }];

      await Promise.all([
        this.notify.notifyUser({
          userId: payment.lease.ownerId,
          event: 'receipt',
          variables,
          emailAttachments,
        }),
        this.notify.notifyUser({
          userId: payment.lease.tenantUserId,
          event: 'receipt',
          variables,
          emailAttachments,
        }),
      ]);
    } catch (error) {
      this.logger.error(`[payment-confirmed] échec pour paiement=${event.paymentId}`, error);
    }
  }
}

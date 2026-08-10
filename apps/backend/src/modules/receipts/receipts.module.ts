import { Module } from '@nestjs/common';
import { ReceiptPdfService } from './receipt-pdf.service';
import { PaymentConfirmedListener } from './payment-confirmed.listener';

@Module({
  providers: [ReceiptPdfService, PaymentConfirmedListener],
  exports: [ReceiptPdfService],
})
export class ReceiptsModule {}

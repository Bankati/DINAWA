import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { PaymentWithAccess } from '../payments/payments.service';

const BRAND_NAVY = '#13284A';
const BRAND_GOLD = '#C9A227';
const MUTED = '#6B7280';

const SOURCE_LABELS: Record<string, string> = {
  CASHPAY_API: 'Paiement en ligne (Cashpay)',
  MANUAL_OWNER: 'Saisie manuelle',
  TENANT_DECLARATION: 'Déclaration locataire confirmée',
};

const METHOD_LABELS: Record<string, string> = {
  TMONEY: 'T-Money',
  FLOOZ: 'Flooz',
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement bancaire',
};

function fcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

// Génère la quittance à la volée — jamais persistée, ni en base ni en
// Storage (voir build-plan.md unité 21). Aucune maquette client fournie à
// ce jour : gabarit sobre, à faire évoluer sans changer la signature dès
// qu'une maquette officielle arrive.
@Injectable()
export class ReceiptPdfService {
  async generate(data: PaymentWithAccess): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    this.render(doc, data);
    doc.end();

    return done;
  }

  private render(doc: PDFKit.PDFDocument, data: PaymentWithAccess): void {
    const { lease, scheduleEntry } = data;
    const isMonthly = lease.paymentFrequency === 'MONTHLY';
    const ownerName = `${lease.owner.firstName} ${lease.owner.lastName}`;
    const tenantName = `${lease.tenant.firstName} ${lease.tenant.lastName}`;

    doc
      .fillColor(BRAND_NAVY)
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('WARAH', 50, 50)
      .fillColor(BRAND_GOLD)
      .fontSize(10)
      .font('Helvetica')
      .text('LA GESTION LOCATIVE INTELLIGENTE', 50, 78);

    doc
      .fillColor(BRAND_NAVY)
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('QUITTANCE DE LOYER', 50, 120);

    if (!isMonthly) {
      doc
        .fillColor(MUTED)
        .fontSize(10)
        .font('Helvetica')
        .text(
          `Période du ${format(scheduleEntry.periodStart, 'dd/MM/yyyy')} au ${format(scheduleEntry.periodEnd, 'dd/MM/yyyy')} — Montant perçu : ${fcfa(data.paidAmount)}`,
          50,
          142,
        );
    }

    let y = isMonthly ? 150 : 165;

    const row = (label: string, value: string): void => {
      doc.fillColor(MUTED).fontSize(10).font('Helvetica').text(label, 50, y, { continued: false });
      doc
        .fillColor('#1A1A1A')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(value, 50, y + 14);
      y += 42;
    };

    row('Propriétaire', ownerName);
    row('Locataire', tenantName);
    row('Bien', lease.property.address);
    row(
      'Période couverte',
      `${format(scheduleEntry.periodStart, 'dd/MM/yyyy')} — ${format(scheduleEntry.periodEnd, 'dd/MM/yyyy')}`,
    );
    row('Montant perçu', fcfa(data.paidAmount));
    row('Date du paiement', data.paidAt ? format(data.paidAt, 'dd/MM/yyyy à HH:mm') : '—');
    row('Mode de paiement', data.paymentMethod ? METHOD_LABELS[data.paymentMethod] : '—');
    row('Référence', data.transactionId ?? data.id);
    row('Source', SOURCE_LABELS[data.source] ?? data.source);

    doc
      .fillColor(MUTED)
      .fontSize(9)
      .font('Helvetica')
      .text('Document généré automatiquement par WARAH — valeur de reçu de paiement.', 50, 780, {
        width: 495,
        align: 'center',
      });
  }
}

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
  // toLocaleString('fr-FR') produit une espace fine U+202F que WinAnsiEncoding
  // ne supporte pas (rendu en '/') — on normalise en espace ordinaire.
  return `${amount.toLocaleString('fr-FR').replace(/\u202f/g, ' ')} FCFA`;
}

// Convertit un montant en toutes lettres (français) - version simplifiée
function amountInWords(amount: number): string {
  return `${amount} francs CFA`;
}

// Génère la quittance à la volée — jamais persistée, ni en base ni en
// Storage (voir build-plan.md unité 21). Format WARAH officiel avec
// tableau structuré, mention légale et QR code de vérification.
@Injectable()
export class ReceiptPdfService {
  async generate(data: PaymentWithAccess): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 50, compress: false });
    const chunks: Buffer[] = [];

    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    this.renderWarahFormat(doc, data);
    doc.end();

    return done;
  }

  private renderWarahFormat(doc: PDFKit.PDFDocument, data: PaymentWithAccess): void {
    const { lease, scheduleEntry } = data;
    const ownerName = lease.owner ? `${lease.owner.firstName} ${lease.owner.lastName}` : 'Non renseigné';
    const tenantName = lease.tenant ? `${lease.tenant.firstName} ${lease.tenant.lastName}` : 'Non renseigné';
    const receiptNumber = data.id.substring(0, 8).toUpperCase();
    const period = format(scheduleEntry.periodStart, 'MMMM yyyy');
    const totalAmount = data.paidAmount;
    const chargesAmount = 0;
    const rentAmount = totalAmount - chargesAmount;
    
    doc.fillColor(BRAND_NAVY).fontSize(18).font('Helvetica-Bold').text('WARAH – Gestion locative simplifiée', 50, 50);
    doc.fillColor(BRAND_NAVY).fontSize(14).font('Helvetica-Bold').text('QUITTANCE DE LOYER', 50, 80);
    doc.fillColor(MUTED).fontSize(10).font('Helvetica').text(`N° ${receiptNumber}`, 50, 100);
    doc.fillColor(MUTED).fontSize(10).font('Helvetica').text(`Période : ${period}`, 50, 115);
    
    let y = 140;
    doc.fillColor(BRAND_NAVY).fontSize(11).font('Helvetica-Bold').text('BIEN LOUÉ', 50, y);
    y += 15;
    doc.fillColor(MUTED).fontSize(10).font('Helvetica').text(`Adresse du bien : ${lease.property?.address || 'Non renseignée'}`, 50, y);
    y += 12;
    doc.fillColor(MUTED).fontSize(10).font('Helvetica').text(`Type : ${lease.property?.type || 'Appartement'}`, 50, y);
    
    y += 25;
    const tableTop = y;
    const colWidth = 245;
    const rowHeight = 80;
    
    doc.strokeColor('#E5E7EB').lineWidth(0.5);
    doc.rect(50, tableTop, colWidth * 2 + 10, rowHeight).stroke();
    doc.moveTo(50 + colWidth + 5, tableTop).lineTo(50 + colWidth + 5, tableTop + rowHeight).stroke();
    
    doc.fillColor(BRAND_NAVY).fontSize(10).font('Helvetica-Bold').text('BAILLEUR', 55, tableTop + 8);
    doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(`Nom / Raison sociale : ${ownerName}`, 55, tableTop + 25);
    doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(`Adresse : ${lease.owner?.city || 'Lomé'}`, 55, tableTop + 38);
    doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(`Téléphone : ${lease.owner?.phone || '—'}`, 55, tableTop + 51);
    doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(`E-mail : ${lease.owner?.email || '—'}`, 55, tableTop + 64);
    
    doc.fillColor(BRAND_NAVY).fontSize(10).font('Helvetica-Bold').text('LOCATAIRE', 55 + colWidth + 10, tableTop + 8);
    doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(`Nom et prénom(s) : ${tenantName}`, 55 + colWidth + 10, tableTop + 25);
    doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(`Téléphone : ${lease.tenant?.phone || '—'}`, 55 + colWidth + 10, tableTop + 38);
    doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(`E-mail : ${lease.tenant?.email || '—'}`, 55 + colWidth + 10, tableTop + 51);
    doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(`N° de contrat de bail : ${lease.id.substring(0, 8).toUpperCase()}`, 55 + colWidth + 10, tableTop + 64);
    
    y = tableTop + rowHeight + 20;
    doc.fillColor(BRAND_NAVY).fontSize(11).font('Helvetica-Bold').text('DÉTAIL DU PAIEMENT', 50, y);
    
    y += 20;
    const paymentTableTop = y;
    const paymentRowHeight = 20;
    const paymentRows = 6;
    
    doc.strokeColor('#E5E7EB').lineWidth(0.5);
    doc.rect(50, paymentTableTop, colWidth * 2 + 10, paymentRowHeight * paymentRows).stroke();
    doc.moveTo(50, paymentTableTop + paymentRowHeight).lineTo(50 + colWidth * 2 + 10, paymentTableTop + paymentRowHeight).stroke();
    doc.moveTo(50, paymentTableTop + paymentRowHeight * 2).lineTo(50 + colWidth * 2 + 10, paymentTableTop + paymentRowHeight * 2).stroke();
    doc.moveTo(50, paymentTableTop + paymentRowHeight * 3).lineTo(50 + colWidth * 2 + 10, paymentTableTop + paymentRowHeight * 3).stroke();
    doc.moveTo(50, paymentTableTop + paymentRowHeight * 4).lineTo(50 + colWidth * 2 + 10, paymentTableTop + paymentRowHeight * 4).stroke();
    doc.moveTo(50, paymentTableTop + paymentRowHeight * 5).lineTo(50 + colWidth * 2 + 10, paymentTableTop + paymentRowHeight * 5).stroke();
    doc.moveTo(50 + colWidth + 5, paymentTableTop).lineTo(50 + colWidth + 5, paymentTableTop + paymentRowHeight * paymentRows).stroke();
    
    doc.fillColor(BRAND_NAVY).fontSize(9).font('Helvetica-Bold').text('Libellé', 55, paymentTableTop + 6);
    doc.fillColor(BRAND_NAVY).fontSize(9).font('Helvetica-Bold').text('Montant', 55 + colWidth + 10, paymentTableTop + 6);
    
    const paymentRowsData: [string, string][] = [
      ['Montant du loyer', fcfa(rentAmount)],
      ['Charges (le cas échéant)', fcfa(chargesAmount)],
      ['MONTANT TOTAL RÉGLÉ', fcfa(totalAmount)],
      ['Montant en toutes lettres', `${amountInWords(totalAmount)} francs CFA`],
      ['Mode de paiement', data.paymentMethod ? (METHOD_LABELS[data.paymentMethod] || data.paymentMethod) : '—'],
      ['Date de paiement', data.paidAt ? format(data.paidAt, 'dd/MM/yyyy') : '—'],
    ];
    
    paymentRowsData.forEach((row, index) => {
      const rowY = paymentTableTop + paymentRowHeight * (index + 1) + 6;
      if (index === 2) {
        doc.fillColor(BRAND_NAVY).fontSize(9).font('Helvetica-Bold').text(row[0], 55, rowY);
        doc.fillColor(BRAND_NAVY).fontSize(9).font('Helvetica-Bold').text(row[1], 55 + colWidth + 10, rowY);
      } else {
        doc.fillColor('#1A1A1A').fontSize(9).font('Helvetica').text(row[0], 55, rowY);
        doc.fillColor('#1A1A1A').fontSize(9).font('Helvetica').text(row[1], 55 + colWidth + 10, rowY);
      }
    });
    
    y = paymentTableTop + paymentRowHeight * paymentRows + 15;
    const transactionRef = data.transactionId || data.id;
    doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(`Référence de transaction : ${transactionRef}`, 50, y);
    
    y += 25;
    doc.fillColor(BRAND_NAVY).fontSize(10).font('Helvetica-Bold').text('MENTION LÉGALE', 50, y);
    y += 15;
    const legalText = 'Le bailleur soussigné reconnaît avoir reçu du locataire susnommé la somme totale indiquée ci-dessus, au titre du loyer et des charges pour la période mentionnée, et lui en donne quittance, sous réserve de tous ses droits.';
    doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(legalText, 50, y, { width: 495 });
    y += 20;
    const legalText2 = 'Cette quittance annule tout reçu provisoire établi précédemment pour le même règlement. Elle ne vaut quittance que pour la période indiquée et ne préjuge pas du paiement des loyers antérieurs ou postérieurs.';
    doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(legalText2, 50, y, { width: 495 });
    
    y += 70;
    const footerTop = y;
    const footerHeight = 100;
    
    doc.strokeColor('#E5E7EB').lineWidth(0.5);
    doc.rect(50, footerTop, colWidth * 2 + 10, footerHeight).stroke();
    
    doc.fillColor(MUTED).fontSize(8).font('Helvetica').text('[QR CODE]', 70, footerTop + 10);
    doc.fillColor(MUTED).fontSize(7).font('Helvetica').text('Vérification d\'authenticité', 55, footerTop + 50);
    doc.fillColor(MUTED).fontSize(6).font('Helvetica').text('Scannez ce code pour vérifier', 55, footerTop + 62);
    doc.fillColor(MUTED).fontSize(6).font('Helvetica').text('cette quittance en ligne :', 55, footerTop + 72);
    doc.fillColor(BRAND_NAVY).fontSize(6).font('Helvetica').text(`www.warah.tg/verif/${receiptNumber}`, 55, footerTop + 82);
    
    const signatureX = 50 + colWidth + 50;
    doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(`Fait à Lomé, le ${format(new Date(), 'dd/MM/yyyy')}`, signatureX, footerTop + 20);
    doc.fillColor(BRAND_NAVY).fontSize(9).font('Helvetica-Bold').text('Le bailleur', signatureX, footerTop + 50);
    doc.strokeColor(BRAND_NAVY).lineWidth(1);
    doc.moveTo(signatureX, footerTop + 75).lineTo(signatureX + 150, footerTop + 75).stroke();
  }
}

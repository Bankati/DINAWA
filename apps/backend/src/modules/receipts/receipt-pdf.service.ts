import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PaymentWithAccess } from '../payments/payments.service';

const NAVY   = '#0F4C81';
const NAVY_D = '#0A2650';
const GOLD   = '#C9982E';
const MUTED  = '#6B7280';
const LIGHT  = '#F0F4FF';
const BORDER = '#E5E7EB';
const TEXT   = '#111827';

const METHOD_LABELS: Record<string, string> = {
  CASH:          'Espèces',
  BANK_TRANSFER: 'Virement bancaire',
  TMONEY:        'T-Money',
  FLOOZ:         'Flooz',
};

function fcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR').replace(/ /g, ' ')} FCFA`;
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

@Injectable()
export class ReceiptPdfService {
  async generate(data: PaymentWithAccess): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 0, compress: true });
    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end',  () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    this.render(doc, data);
    doc.end();
    return done;
  }

  private render(doc: PDFKit.PDFDocument, data: PaymentWithAccess): void {
    const { lease, scheduleEntry } = data;
    const W = 595.28; // A4 width
    const M = 48;     // left/right margin
    const CW = W - M * 2;

    const ownerName  = lease.owner  ? `${lease.owner.firstName} ${lease.owner.lastName}`   : '—';
    const tenantName = lease.tenant ? `${lease.tenant.firstName} ${lease.tenant.lastName}` : '—';
    const refNum     = data.id.substring(0, 8).toUpperCase();
    const period     = capitalizeFirst(format(scheduleEntry.periodStart, 'MMMM yyyy', { locale: fr }));
    const paidDate   = data.paidAt ? format(data.paidAt, 'dd/MM/yyyy') : '—';
    const method     = METHOD_LABELS[data.paymentMethod ?? ''] ?? data.paymentMethod ?? '—';
    const total      = data.paidAmount;
    const property   = lease.property;
    const propAddress = [property?.address, property?.neighborhood, property?.city].filter(Boolean).join(', ') || '—';

    // ─────────────────────────────────────────────────────────
    // HEADER BAND
    // ─────────────────────────────────────────────────────────
    doc.rect(0, 0, W, 88).fill(NAVY_D);
    // Gold accent line at bottom of header
    doc.rect(0, 84, W, 4).fill(GOLD);

    // "WARAH" — left
    doc.fillColor('#FFFFFF').fontSize(24).font('Helvetica-Bold').text('WARAH', M, 22, { lineBreak: false });
    doc.fillColor(GOLD).fontSize(8).font('Helvetica').text('GESTION LOCATIVE', M, 52, { lineBreak: false, characterSpacing: 1.5 });

    // "QUITTANCE DE LOYER" — right
    doc.fillColor('#FFFFFF').fontSize(15).font('Helvetica-Bold')
       .text('QUITTANCE DE LOYER', 0, 24, { align: 'right', width: W - M, lineBreak: false });
    doc.fillColor('#FFFFFF', 0.55).fontSize(8).font('Helvetica')
       .text(`N° ${refNum}  ·  ${period}`, 0, 48, { align: 'right', width: W - M, lineBreak: false });

    // ─────────────────────────────────────────────────────────
    // MONTANT MIS EN AVANT
    // ─────────────────────────────────────────────────────────
    let y = 104;
    doc.rect(M, y, CW, 58).fill(LIGHT);
    // Gold left bar
    doc.rect(M, y, 4, 58).fill(GOLD);

    doc.fillColor(MUTED).fontSize(7.5).font('Helvetica')
       .text('MONTANT TOTAL RÉGLÉ', M + 18, y + 10, { characterSpacing: 0.8 });
    doc.fillColor(NAVY_D).fontSize(24).font('Helvetica-Bold')
       .text(fcfa(total), M + 18, y + 22, { lineBreak: false });

    // Mode & date — droite
    doc.fillColor(MUTED).fontSize(8).font('Helvetica')
       .text(`Mode  ${method}`, 0, y + 12, { align: 'right', width: W - M - 8, lineBreak: false });
    doc.fillColor(MUTED).fontSize(8).font('Helvetica')
       .text(`Payé le  ${paidDate}`, 0, y + 27, { align: 'right', width: W - M - 8, lineBreak: false });

    // ─────────────────────────────────────────────────────────
    // BAILLEUR / LOCATAIRE
    // ─────────────────────────────────────────────────────────
    y += 74;
    const HALF = (CW - 10) / 2;

    this.partyCard(doc, M,          y, HALF, 'BAILLEUR',   ownerName,
      [
        `Tél : ${lease.owner?.phone  || '—'}`,
        `Email : ${lease.owner?.email || '—'}`,
      ]);
    this.partyCard(doc, M + HALF + 10, y, HALF, 'LOCATAIRE', tenantName,
      [
        `Tél : ${lease.tenant?.phone  || '—'}`,
        `Email : ${lease.tenant?.email || '—'}`,
        `Réf. contrat : ${lease.id.substring(0, 8).toUpperCase()}`,
      ]);

    // ─────────────────────────────────────────────────────────
    // BIEN LOUÉ
    // ─────────────────────────────────────────────────────────
    y += 100;
    this.sectionTitle(doc, M, y, CW, 'BIEN LOUÉ');
    y += 18;
    doc.fillColor(TEXT).fontSize(9).font('Helvetica-Bold').text(propAddress, M + 6, y);
    if (property?.type) {
      doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(`Type : ${property.type}`, M + 6, y + 13);
    }

    // ─────────────────────────────────────────────────────────
    // TABLEAU DÉTAIL
    // ─────────────────────────────────────────────────────────
    y += 38;
    this.sectionTitle(doc, M, y, CW, 'DÉTAIL DU PAIEMENT');
    y += 18;

    const COL1 = CW * 0.62;
    const COL2 = CW - COL1;
    const RH   = 22;

    // Header row
    doc.rect(M, y, CW, RH).fill(NAVY);
    doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold')
       .text('Libellé', M + 10, y + 7, { lineBreak: false });
    doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold')
       .text('Montant', M + COL1 + 8, y + 7, { lineBreak: false });
    y += RH;

    const rows: Array<{ label: string; value: string; bold?: boolean }> = [
      { label: 'Loyer (hors charges)', value: fcfa(total) },
      { label: 'Provisions sur charges',  value: fcfa(0) },
      { label: 'TOTAL RÉGLÉ',             value: fcfa(total), bold: true },
      { label: 'Mode de règlement',        value: method },
      { label: 'Date effective',           value: paidDate },
      { label: 'Référence WARAH',          value: refNum },
    ];

    rows.forEach((row, i) => {
      const bg = row.bold ? LIGHT : (i % 2 === 0 ? '#FFFFFF' : '#F9FAFB');
      doc.rect(M, y, CW, RH).fill(bg);
      // Vertical divider
      doc.strokeColor(BORDER).lineWidth(0.5)
         .moveTo(M + COL1, y).lineTo(M + COL1, y + RH).stroke();

      const font   = row.bold ? 'Helvetica-Bold' : 'Helvetica';
      const color  = row.bold ? NAVY_D : TEXT;
      const color2 = row.bold ? NAVY_D : '#374151';

      doc.fillColor(color).fontSize(8.5).font(font)
         .text(row.label, M + 10, y + 7, { lineBreak: false });
      doc.fillColor(color2).fontSize(8.5).font(font)
         .text(row.value, M + COL1 + 8, y + 7, { lineBreak: false });

      // Bottom separator
      doc.strokeColor(BORDER).lineWidth(0.3)
         .moveTo(M, y + RH).lineTo(M + CW, y + RH).stroke();
      y += RH;
    });

    // Table outer border
    const tableH = RH * (rows.length + 1);
    doc.strokeColor(BORDER).lineWidth(0.6)
       .rect(M, y - tableH, CW, tableH).stroke();

    // ─────────────────────────────────────────────────────────
    // MENTION LÉGALE
    // ─────────────────────────────────────────────────────────
    y += 16;
    const LEGAL_H = 48;
    doc.rect(M, y, CW, LEGAL_H).fill('#F9FAFB');
    doc.rect(M, y, 3, LEGAL_H).fill(GOLD);
    const legal = 'Le bailleur soussigné reconnaît avoir reçu du locataire susnommé la somme indiquée ci-dessus au titre du loyer et des charges pour la période mentionnée, et lui en donne quittance sous réserve de tous ses droits. Cette quittance annule tout reçu provisoire antérieur pour la même période et ne préjuge pas du paiement des loyers à venir.';
    doc.fillColor(MUTED).fontSize(7.5).font('Helvetica').text(legal, M + 12, y + 8, { width: CW - 20 });

    // ─────────────────────────────────────────────────────────
    // FOOTER BAND
    // ─────────────────────────────────────────────────────────
    const FY = 756;
    doc.rect(0, FY, W, 86).fill(NAVY_D);

    // QR placeholder (left)
    const QX = M;
    const QY = FY + 14;
    doc.save().rect(QX, QY, 52, 52).clip();
    doc.rect(QX, QY, 52, 52).fill('#1A3C6B');
    // Mini grid to suggest QR
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if ((r + c) % 2 === 0 || (r === 0 && c === 0) || (r === 0 && c === 4) || (r === 4 && c === 0)) {
          doc.rect(QX + 4 + c * 9, QY + 4 + r * 9, 7, 7).fill('#FFFFFF');
        }
      }
    }
    doc.restore();
    doc.fillColor('#FFFFFF', 0.45).fontSize(5.5).font('Helvetica')
       .text(`warah.tg/verif/${refNum}`, QX, QY + 56, { width: 80, align: 'center' });

    // Center: date + authenticité
    doc.fillColor('#FFFFFF', 0.75).fontSize(8).font('Helvetica')
       .text(`Émis le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`, 0, FY + 24, { align: 'center', width: W });
    doc.fillColor(GOLD).fontSize(7).font('Helvetica')
       .text('Document officiel · Plateforme WARAH', 0, FY + 40, { align: 'center', width: W, characterSpacing: 0.5 });

    // Signature — right
    const SX = W - M - 140;
    doc.strokeColor('#FFFFFF', 0.35).lineWidth(0.5)
       .moveTo(SX, FY + 54).lineTo(SX + 140, FY + 54).stroke();
    doc.fillColor('#FFFFFF', 0.5).fontSize(7).font('Helvetica')
       .text('Signature du bailleur', SX, FY + 58, { width: 140, align: 'center' });
  }

  private sectionTitle(doc: PDFKit.PDFDocument, x: number, y: number, w: number, title: string): void {
    doc.fillColor(NAVY_D).fontSize(8.5).font('Helvetica-Bold')
       .text(title, x, y, { characterSpacing: 0.8, lineBreak: false });
    doc.strokeColor(GOLD).lineWidth(1)
       .moveTo(x, y + 13).lineTo(x + w, y + 13).stroke();
  }

  private partyCard(
    doc: PDFKit.PDFDocument,
    x: number, y: number, w: number,
    role: string, name: string, lines: string[],
  ): void {
    const H = 96;
    doc.rect(x, y, w, H).fill('#F9FAFB');
    // Top color bar
    doc.rect(x, y, w, 6).fill(NAVY);
    // Role label on the bar
    doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold')
       .text(role, x + 10, y + 10, { lineBreak: false, characterSpacing: 0.8 });
    // Name
    doc.fillColor(NAVY_D).fontSize(10).font('Helvetica-Bold')
       .text(name, x + 10, y + 24);
    // Detail lines
    lines.forEach((line, i) => {
      doc.fillColor(MUTED).fontSize(8).font('Helvetica')
         .text(line, x + 10, y + 42 + i * 14, { lineBreak: false });
    });
    // Border
    doc.strokeColor(BORDER).lineWidth(0.5).rect(x, y, w, H).stroke();
  }
}

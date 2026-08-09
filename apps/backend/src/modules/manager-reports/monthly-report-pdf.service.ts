import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { ConsolidatedReportData } from './manager-reports.types';

const BRAND_NAVY = '#13284A';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';

// Marge basse au-delà de laquelle une nouvelle ligne doit passer à la page
// suivante — évite tout chevauchement/troncature silencieuse pour un
// propriétaire avec beaucoup de biens/paiements/impayés (voir /review unité
// 33 : ReceiptPdfService n'a jamais eu ce problème car son contenu est de
// taille fixe, contrairement aux listes de longueur variable ici).
const PAGE_TOP = 50;
const PAGE_BOTTOM = 780;

function fcfa(amount: number): string {
  // Voir receipt-pdf.service.ts — toLocaleString('fr-FR') produit une espace
  // fine U+202F que WinAnsiEncoding ne supporte pas (rendu en '/').
  return `${amount.toLocaleString('fr-FR').replace(/ /g, ' ')} FCFA`;
}

// Génère le rapport mensuel consolidé à la volée — jamais persisté, ni en
// base ni en Storage (voir build-plan.md unité 33, même invariant que les
// quittances de l'unité 21).
@Injectable()
export class MonthlyReportPdfService {
  async generate(data: ConsolidatedReportData): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 50, compress: false });
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

  private ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number): number {
    if (y + needed > PAGE_BOTTOM) {
      doc.addPage();
      return PAGE_TOP;
    }
    return y;
  }

  private render(doc: PDFKit.PDFDocument, data: ConsolidatedReportData): void {
    const ownerName = `${data.owner.firstName} ${data.owner.lastName}`;
    const managerName = `${data.manager.firstName} ${data.manager.lastName}`;

    doc.fillColor(BRAND_NAVY).fontSize(18).font('Helvetica-Bold').text('WARAH', 50, 50);
    doc
      .fillColor(BRAND_NAVY)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('RAPPORT MENSUEL DE GESTION', 50, 78);
    doc
      .fillColor(MUTED)
      .fontSize(10)
      .font('Helvetica')
      .text(`Période : ${data.periodLabel}`, 50, 100);
    doc
      .fillColor(MUTED)
      .fontSize(10)
      .font('Helvetica')
      .text(`Propriétaire : ${ownerName}`, 50, 115);
    doc
      .fillColor(MUTED)
      .fontSize(10)
      .font('Helvetica')
      .text(`Gestionnaire : ${managerName}`, 50, 130);
    doc
      .fillColor(MUTED)
      .fontSize(9)
      .font('Helvetica')
      .text(`${data.properties.length} bien(s) confié(s)`, 50, 145);

    let y = 175;

    doc.fillColor(BRAND_NAVY).fontSize(12).font('Helvetica-Bold').text('PAIEMENTS REÇUS', 50, y);
    y += 20;

    if (data.paymentsByProperty.every((p) => p.payments.length === 0)) {
      y = this.ensureSpace(doc, y, 20);
      doc.fillColor(MUTED).fontSize(9).font('Helvetica').text('Aucun paiement ce mois-ci.', 50, y);
      y += 20;
    } else {
      for (const propertyGroup of data.paymentsByProperty) {
        if (propertyGroup.payments.length === 0) continue;
        y = this.ensureSpace(doc, y, 14);
        doc
          .fillColor(BRAND_NAVY)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(propertyGroup.property.address, 50, y);
        y += 14;
        for (const payment of propertyGroup.payments) {
          y = this.ensureSpace(doc, y, 13);
          const dateLabel = payment.paidAt ? format(payment.paidAt, 'dd/MM/yyyy') : '—';
          doc
            .fillColor('#1A1A1A')
            .fontSize(9)
            .font('Helvetica')
            .text(
              `${dateLabel} — ${fcfa(payment.paidAmount)} (${payment.paymentMethod ?? '—'})`,
              60,
              y,
            );
          y += 13;
        }
        y = this.ensureSpace(doc, y, 20);
        doc
          .fillColor(BRAND_NAVY)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(`Total : ${fcfa(propertyGroup.totalReceived)}`, 60, y);
        y += 20;
      }
    }

    y = this.ensureSpace(doc, y, 30);
    doc
      .fillColor(BRAND_NAVY)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`TOTAL REÇU CE MOIS : ${fcfa(data.totalReceived)}`, 50, y);
    y += 30;

    y = this.ensureSpace(doc, y, 20);
    doc.strokeColor(BORDER).lineWidth(0.5).moveTo(50, y).lineTo(545, y).stroke();
    y += 20;

    y = this.ensureSpace(doc, y, 20);
    doc
      .fillColor(BRAND_NAVY)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('RETARDS ET IMPAYÉS EN COURS', 50, y);
    y += 20;

    if (data.overdueEntries.length === 0) {
      y = this.ensureSpace(doc, y, 20);
      doc.fillColor(MUTED).fontSize(9).font('Helvetica').text('Aucun impayé en cours.', 50, y);
      y += 20;
    } else {
      for (const entry of data.overdueEntries) {
        y = this.ensureSpace(doc, y, 16);
        const tenantName = `${entry.tenant.firstName} ${entry.tenant.lastName}`;
        doc
          .fillColor('#B91C1C')
          .fontSize(9)
          .font('Helvetica')
          .text(
            `${entry.property.address} — ${tenantName} — échéance du ${format(entry.dueDate, 'dd/MM/yyyy')} — ${fcfa(entry.expectedAmount - entry.paidAmount)} restant`,
            50,
            y,
            { width: 495 },
          );
        y += 16;
      }
      y += 10;
    }

    y = this.ensureSpace(doc, y, 20);
    doc.strokeColor(BORDER).lineWidth(0.5).moveTo(50, y).lineTo(545, y).stroke();
    y += 20;

    y = this.ensureSpace(doc, y, 20);
    doc
      .fillColor(BRAND_NAVY)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('DÉCLARATIONS DE PAIEMENT TRAITÉES', 50, y);
    y += 20;

    if (data.processedDeclarations.length === 0) {
      y = this.ensureSpace(doc, y, 20);
      doc
        .fillColor(MUTED)
        .fontSize(9)
        .font('Helvetica')
        .text('Aucune déclaration traitée ce mois-ci.', 50, y);
    } else {
      for (const declaration of data.processedDeclarations) {
        y = this.ensureSpace(doc, y, 16);
        const tenantName = `${declaration.tenant.firstName} ${declaration.tenant.lastName}`;
        const statusLabel = declaration.status === 'PAID' ? 'confirmée' : 'rejetée';
        doc
          .fillColor('#1A1A1A')
          .fontSize(9)
          .font('Helvetica')
          .text(
            `${declaration.property.address} — ${tenantName} — ${fcfa(declaration.paidAmount)} — ${statusLabel} le ${format(declaration.processedAt, 'dd/MM/yyyy')}`,
            50,
            y,
            { width: 495 },
          );
        y += 16;
      }
    }
  }
}

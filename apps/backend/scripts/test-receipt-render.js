// Génère une quittance de test — pure JS, pas de ts-node requis
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const { fr } = require('date-fns/locale');

const NAVY   = '#0F4C81';
const NAVY_D = '#0A2650';
const GOLD   = '#C9982E';
const MUTED  = '#6B7280';
const LIGHT  = '#F0F4FF';
const BORDER = '#E5E7EB';
const TEXT   = '#111827';

function fcfa(n) {
  return `${n.toLocaleString('fr-FR').replace(/ /g, ' ')} FCFA`;
}
function capitalizeFirst(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function sectionTitle(doc, x, y, w, title) {
  doc.fillColor(NAVY_D).fontSize(8.5).font('Helvetica-Bold').text(title, x, y, { characterSpacing: 0.8, lineBreak: false });
  doc.strokeColor(GOLD).lineWidth(1).moveTo(x, y + 13).lineTo(x + w, y + 13).stroke();
}

function partyCard(doc, x, y, w, role, name, lines) {
  const H = 96;
  doc.rect(x, y, w, H).fill('#F9FAFB');
  doc.rect(x, y, w, 6).fill(NAVY);
  doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold').text(role, x + 10, y + 10, { lineBreak: false, characterSpacing: 0.8 });
  doc.fillColor(NAVY_D).fontSize(10).font('Helvetica-Bold').text(name, x + 10, y + 24);
  lines.forEach((line, i) => {
    doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(line, x + 10, y + 42 + i * 14, { lineBreak: false });
  });
  doc.strokeColor(BORDER).lineWidth(0.5).rect(x, y, w, H).stroke();
}

const data = {
  id: 'a1b2c3d40000000000000000',
  paidAmount: 185000,
  paidAt: new Date('2026-08-01'),
  paymentMethod: 'BANK_TRANSFER',
  scheduleEntry: {
    periodStart: new Date('2026-08-01'),
    periodEnd:   new Date('2026-08-31'),
  },
  lease: {
    id: 'lease0010000000000000',
    ownerId: 'o1',
    tenantUserId: 't1',
    owner:  { firstName: 'Kofi', lastName: 'Mensah', phone: '+228 90 00 11 22', email: 'kofi.mensah@warah.tg', city: 'Lomé' },
    tenant: { firstName: 'Adomgnoyarou', lastName: 'Locataire', phone: '+228 91 22 33 44', email: 'locataire@warah.tg' },
    property: { address: '12, Rue des Cocotiers', neighborhood: 'Bè', city: 'Lomé', type: 'Appartement' },
  },
};

const doc = new PDFDocument({ size: 'A4', margin: 0, compress: true });
const out = path.join(__dirname, '..', 'quittance-test-rendu.pdf');
doc.pipe(fs.createWriteStream(out));

const { lease, scheduleEntry } = data;
const W = 595.28;
const M = 48;
const CW = W - M * 2;
const METHOD_LABELS = { CASH: 'Espèces', BANK_TRANSFER: 'Virement bancaire', TMONEY: 'T-Money', FLOOZ: 'Flooz' };

const ownerName  = `${lease.owner.firstName} ${lease.owner.lastName}`;
const tenantName = `${lease.tenant.firstName} ${lease.tenant.lastName}`;
const refNum     = data.id.substring(0, 8).toUpperCase();
const period     = capitalizeFirst(format(scheduleEntry.periodStart, 'MMMM yyyy', { locale: fr }));
const paidDate   = data.paidAt ? format(data.paidAt, 'dd/MM/yyyy') : '—';
const method     = METHOD_LABELS[data.paymentMethod] ?? data.paymentMethod ?? '—';
const total      = data.paidAmount;
const property   = lease.property;
const propAddress = [property.address, property.neighborhood, property.city].filter(Boolean).join(', ') || '—';

// HEADER
doc.rect(0, 0, W, 88).fill(NAVY_D);
doc.rect(0, 84, W, 4).fill(GOLD);
doc.fillColor('#FFFFFF').fontSize(24).font('Helvetica-Bold').text('WARAH', M, 22, { lineBreak: false });
doc.fillColor(GOLD).fontSize(8).font('Helvetica').text('GESTION LOCATIVE', M, 52, { lineBreak: false, characterSpacing: 1.5 });
doc.fillColor('#FFFFFF').fontSize(15).font('Helvetica-Bold').text('QUITTANCE DE LOYER', 0, 24, { align: 'right', width: W - M, lineBreak: false });
doc.fillColor('#FFFFFF', 0.55).fontSize(8).font('Helvetica').text(`N° ${refNum}  ·  ${period}`, 0, 48, { align: 'right', width: W - M, lineBreak: false });

// MONTANT
let y = 104;
doc.rect(M, y, CW, 58).fill(LIGHT);
doc.rect(M, y, 4, 58).fill(GOLD);
doc.fillColor(MUTED).fontSize(7.5).font('Helvetica').text('MONTANT TOTAL RÉGLÉ', M + 18, y + 10, { characterSpacing: 0.8 });
doc.fillColor(NAVY_D).fontSize(24).font('Helvetica-Bold').text(fcfa(total), M + 18, y + 22, { lineBreak: false });
doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(`Mode  ${method}`, 0, y + 12, { align: 'right', width: W - M - 8, lineBreak: false });
doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(`Payé le  ${paidDate}`, 0, y + 27, { align: 'right', width: W - M - 8, lineBreak: false });

// PARTIES
y += 74;
const HALF = (CW - 10) / 2;
partyCard(doc, M, y, HALF, 'BAILLEUR', ownerName, [`Tél : ${lease.owner.phone}`, `Email : ${lease.owner.email}`]);
partyCard(doc, M + HALF + 10, y, HALF, 'LOCATAIRE', tenantName, [`Tél : ${lease.tenant.phone}`, `Email : ${lease.tenant.email}`, `Réf. contrat : ${lease.id.substring(0, 8).toUpperCase()}`]);

// BIEN LOUÉ
y += 100;
sectionTitle(doc, M, y, CW, 'BIEN LOUÉ');
y += 18;
doc.fillColor(TEXT).fontSize(9).font('Helvetica-Bold').text(propAddress, M + 6, y);
doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(`Type : ${property.type}`, M + 6, y + 13);

// TABLEAU
y += 38;
sectionTitle(doc, M, y, CW, 'DÉTAIL DU PAIEMENT');
y += 18;

const COL1 = CW * 0.62;
const RH = 22;
doc.rect(M, y, CW, RH).fill(NAVY);
doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold').text('Libellé', M + 10, y + 7, { lineBreak: false });
doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold').text('Montant', M + COL1 + 8, y + 7, { lineBreak: false });
y += RH;

const rows = [
  { label: 'Loyer (hors charges)',  value: fcfa(total),  bold: false },
  { label: 'Provisions sur charges', value: fcfa(0),     bold: false },
  { label: 'TOTAL RÉGLÉ',           value: fcfa(total),  bold: true },
  { label: 'Mode de règlement',     value: method,       bold: false },
  { label: 'Date effective',        value: paidDate,     bold: false },
  { label: 'Référence WARAH',       value: refNum,       bold: false },
];
const tableStartY = y;
rows.forEach((row, i) => {
  const bg = row.bold ? LIGHT : (i % 2 === 0 ? '#FFFFFF' : '#F9FAFB');
  doc.rect(M, y, CW, RH).fill(bg);
  doc.strokeColor(BORDER).lineWidth(0.5).moveTo(M + COL1, y).lineTo(M + COL1, y + RH).stroke();
  const font = row.bold ? 'Helvetica-Bold' : 'Helvetica';
  const c1 = row.bold ? NAVY_D : TEXT;
  const c2 = row.bold ? NAVY_D : '#374151';
  doc.fillColor(c1).fontSize(8.5).font(font).text(row.label, M + 10, y + 7, { lineBreak: false });
  doc.fillColor(c2).fontSize(8.5).font(font).text(row.value, M + COL1 + 8, y + 7, { lineBreak: false });
  doc.strokeColor(BORDER).lineWidth(0.3).moveTo(M, y + RH).lineTo(M + CW, y + RH).stroke();
  y += RH;
});
doc.strokeColor(BORDER).lineWidth(0.6).rect(M, tableStartY, CW, RH * rows.length).stroke();

// MENTION LÉGALE
y += 16;
const LEGAL_H = 48;
doc.rect(M, y, CW, LEGAL_H).fill('#F9FAFB');
doc.rect(M, y, 3, LEGAL_H).fill(GOLD);
const legal = 'Le bailleur soussigné reconnaît avoir reçu du locataire susnommé la somme indiquée ci-dessus au titre du loyer et des charges pour la période mentionnée, et lui en donne quittance sous réserve de tous ses droits. Cette quittance annule tout reçu provisoire antérieur pour la même période et ne préjuge pas du paiement des loyers à venir.';
doc.fillColor(MUTED).fontSize(7.5).font('Helvetica').text(legal, M + 12, y + 8, { width: CW - 20 });

// FOOTER
const FY = 756;
doc.rect(0, FY, W, 86).fill(NAVY_D);
const QX = M, QY = FY + 14;
doc.rect(QX, QY, 52, 52).fill('#1A3C6B');
for (let r = 0; r < 5; r++) {
  for (let c = 0; c < 5; c++) {
    if ((r + c) % 2 === 0 || (r === 0 && c === 0) || (r === 0 && c === 4) || (r === 4 && c === 0)) {
      doc.rect(QX + 4 + c * 9, QY + 4 + r * 9, 7, 7).fill('#FFFFFF');
    }
  }
}
doc.fillColor('#FFFFFF', 0.45).fontSize(5.5).font('Helvetica').text(`warah.tg/verif/${refNum}`, QX, QY + 56, { width: 80, align: 'center' });
doc.fillColor('#FFFFFF', 0.75).fontSize(8).font('Helvetica').text(`Émis le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`, 0, FY + 24, { align: 'center', width: W });
doc.fillColor(GOLD).fontSize(7).font('Helvetica').text('Document officiel · Plateforme WARAH', 0, FY + 40, { align: 'center', width: W });
const SX = W - M - 140;
doc.strokeColor('#FFFFFF', 0.35).lineWidth(0.5).moveTo(SX, FY + 54).lineTo(SX + 140, FY + 54).stroke();
doc.fillColor('#FFFFFF', 0.5).fontSize(7).font('Helvetica').text('Signature du bailleur', SX, FY + 58, { width: 140, align: 'center' });

doc.end();
doc.on('finish', () => console.log(`PDF généré : ${out}`));

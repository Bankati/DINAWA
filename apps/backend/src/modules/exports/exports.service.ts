import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';

const NAVY   = '#0F4C81';
const NAVY_D = '#0A2650';
const GOLD   = '#C9982E';
const MUTED  = '#6B7280';
const LIGHT  = '#F0F4FF';
const BORDER = '#E5E7EB';
const TEXT   = '#111827';
const ROWALT = '#F9FAFB';

const METHOD_LABELS: Record<string, string> = { CASH: 'Espèces', BANK_TRANSFER: 'Virement bancaire', TMONEY: 'T-Money', FLOOZ: 'Flooz' };
const STATUS_LABELS: Record<string, string> = { PAID: 'Payé', PENDING: 'En attente', PENDING_CONFIRMATION: 'À confirmer', REJECTED: 'Rejeté', PARTIAL: 'Partiel', OVERDUE: 'Impayé' };
const PROPERTY_STATUS: Record<string, string> = { OCCUPIED: 'Occupé', VACANT: 'Vacant', RENOVATION: 'En travaux', ARCHIVED: 'Archivé' };
const PROPERTY_TYPE: Record<string, string> = { VILLA: 'Villa', APARTMENT: 'Appartement', STUDIO: 'Studio', COMMERCIAL: 'Local commercial' };
const ACCOUNT_STATUS: Record<string, string> = { ACTIVE: 'Actif', INVITED: 'Invité', SUSPENDED: 'Suspendu' };
const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR');
}
function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('fr-FR') + ' FCFA';
}
function truncate(s: string | null | undefined, max: number): string {
  if (!s) return '—';
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function buildPdf(): { doc: InstanceType<typeof PDFDocument>; done: Promise<Buffer> } {
  const doc = new PDFDocument({ size: 'A4', margin: 0, compress: true });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  return { doc, done };
}

/** Bande d'en-tête bleue commune à tous les exports */
function drawHeader(doc: InstanceType<typeof PDFDocument>, title: string, subtitle: string, rightLine: string) {
  doc.rect(0, 0, 595, 70).fill(NAVY_D);
  doc.fillColor(GOLD).rect(0, 70, 595, 3).fill();
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(18).text('WARAH', 36, 16);
  doc.fillColor('white').font('Helvetica').fontSize(10).fillOpacity(0.75).text(title, 36, 38);
  doc.fillOpacity(1);
  doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(9).text(subtitle, 36, 54);
  doc.fillColor('white').font('Helvetica').fontSize(9).fillOpacity(0.7).text(rightLine, 0, 28, { align: 'right', width: 559 });
  doc.fillOpacity(1);
  doc.y = 90;
}

/** Ligne de séparateur horizontal */
function hRule(doc: InstanceType<typeof PDFDocument>) {
  doc.moveTo(36, doc.y).lineTo(559, doc.y).strokeColor(BORDER).lineWidth(0.5).stroke();
}

/** En-tête de tableau */
function tableHeader(doc: InstanceType<typeof PDFDocument>, cols: { label: string; width: number; align?: 'left' | 'right' | 'center' }[]) {
  const rowH = 22; const startX = 36; let x = startX;
  doc.rect(startX, doc.y, 523, rowH).fill(NAVY);
  cols.forEach(c => {
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8)
      .text(c.label.toUpperCase(), x + 4, doc.y + 7, { width: c.width - 8, align: c.align ?? 'left', lineBreak: false });
    x += c.width;
  });
  doc.y += rowH;
}

/** Ligne de données */
function tableRow(
  doc: InstanceType<typeof PDFDocument>,
  cols: { value: string; width: number; align?: 'left' | 'right' | 'center'; bold?: boolean; color?: string }[],
  rowIndex: number,
  isTotal = false,
) {
  const rowH = 18; const startX = 36; let x = startX;
  const bg = isTotal ? LIGHT : rowIndex % 2 === 0 ? '#ffffff' : ROWALT;
  doc.rect(startX, doc.y, 523, rowH).fill(bg);
  cols.forEach(c => {
    doc.fillColor(c.color ?? (isTotal ? NAVY_D : TEXT))
      .font(c.bold || isTotal ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(8.5)
      .text(c.value, x + 4, doc.y + 5, { width: c.width - 8, align: c.align ?? 'left', lineBreak: false });
    x += c.width;
  });
  doc.y += rowH;
}

/** Pied de page */
function drawFooter(doc: InstanceType<typeof PDFDocument>) {
  const y = 800;
  doc.rect(0, y, 595, 42).fill(NAVY_D);
  doc.fillColor('white').font('Helvetica').fontSize(8).fillOpacity(0.65)
    .text(`Document confidentiel · WARAH · Généré le ${fmtDate(new Date())}`, 36, y + 14, { align: 'center', width: 523 });
  doc.fillOpacity(1);
}

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async paiementsPDF(user: AuthenticatedUser, from?: string, to?: string): Promise<Buffer> {
    const where: Record<string, unknown> = {};
    if (user.role === 'OWNER') where['lease'] = { property: { ownerId: user.id } };
    if (user.role === 'MANAGER') where['lease'] = { property: { mandates: { some: { managerId: user.id, status: 'ACTIVE' } } } };
    if (from || to) {
      where['paidAt'] = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        lease: {
          include: {
            tenant: { select: { firstName: true, lastName: true } },
            property: { select: { address: true, city: true } },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
      take: 1000,
    });

    const { doc, done } = buildPdf();
    const subtitle = from && to ? `Période : ${fmtDate(from)} → ${fmtDate(to)}` : `Au ${fmtDate(new Date())}`;
    drawHeader(doc, 'Historique des paiements', subtitle, `${payments.length} paiements`);
    doc.moveDown(0.5);

    const cols = [
      { label: 'Date', width: 70 },
      { label: 'Locataire', width: 130 },
      { label: 'Bien', width: 140 },
      { label: 'Ville', width: 70 },
      { label: 'Montant', width: 75, align: 'right' as const },
      { label: 'Mode', width: 70 },
      { label: 'Statut', width: 68 },
    ];
    tableHeader(doc, cols);

    let total = 0;
    payments.forEach((p, i) => {
      total += p.paidAmount;
      const tenant = p.lease?.tenant ? `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}` : '—';
      tableRow(doc, [
        { value: fmtDate(p.paidAt ?? p.createdAt), width: 70 },
        { value: truncate(tenant, 20), width: 130 },
        { value: truncate(p.lease?.property?.address, 22), width: 140 },
        { value: truncate(p.lease?.property?.city, 12), width: 70 },
        { value: p.paidAmount.toLocaleString('fr-FR'), width: 75, align: 'right' },
        { value: p.paymentMethod ? (METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod) : '—', width: 70 },
        { value: STATUS_LABELS[p.status] ?? p.status, width: 68 },
      ], i);
    });

    tableRow(doc, [
      { value: 'TOTAL', width: 410, bold: true },
      { value: total.toLocaleString('fr-FR') + ' FCFA', width: 75, align: 'right', bold: true },
      { value: '', width: 138 },
    ], 0, true);

    drawFooter(doc);
    doc.end();
    return done;
  }

  async biensPDF(user: AuthenticatedUser): Promise<Buffer> {
    const where: Record<string, unknown> = {};
    if (user.role === 'OWNER') where['ownerId'] = user.id;
    if (user.role === 'MANAGER') where['mandates'] = { some: { managerId: user.id, status: 'ACTIVE' } };

    const biens = await this.prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const { doc, done } = buildPdf();
    drawHeader(doc, 'Liste des biens', `Au ${fmtDate(new Date())}`, `${biens.length} biens`);
    doc.moveDown(0.5);

    const cols = [
      { label: 'Adresse', width: 160 },
      { label: 'Quartier', width: 100 },
      { label: 'Ville', width: 75 },
      { label: 'Type', width: 80 },
      { label: 'Statut', width: 60 },
      { label: 'Loyer', width: 80, align: 'right' as const },
      { label: 'Charges', width: 68, align: 'right' as const },
    ];
    tableHeader(doc, cols);

    biens.forEach((b, i) => {
      tableRow(doc, [
        { value: truncate(b.address, 25), width: 160 },
        { value: truncate(b.neighborhood, 16), width: 100 },
        { value: truncate(b.city, 12), width: 75 },
        { value: PROPERTY_TYPE[b.type] ?? b.type, width: 80 },
        { value: PROPERTY_STATUS[b.status] ?? b.status, width: 60 },
        { value: b.monthlyRent.toLocaleString('fr-FR'), width: 80, align: 'right' },
        { value: b.monthlyCharges.toLocaleString('fr-FR'), width: 68, align: 'right' },
      ], i);
    });

    drawFooter(doc);
    doc.end();
    return done;
  }

  async locatairesPDF(user: AuthenticatedUser): Promise<Buffer> {
    const where: Record<string, unknown> = {};
    if (user.role === 'OWNER') where['leasesAsTenant'] = { some: { property: { ownerId: user.id } } };
    if (user.role === 'MANAGER') where['leasesAsTenant'] = { some: { property: { mandates: { some: { managerId: user.id, status: 'ACTIVE' } } } } };

    const tenants = await this.prisma.user.findMany({
      where: { role: 'TENANT', ...where },
      include: {
        leasesAsTenant: {
          where: { status: 'ACTIVE' as const },
          include: { property: { select: { address: true, city: true } } },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { lastName: 'asc' },
      take: 500,
    });

    const { doc, done } = buildPdf();
    drawHeader(doc, 'Liste des locataires', `Au ${fmtDate(new Date())}`, `${tenants.length} locataires`);
    doc.moveDown(0.5);

    const cols = [
      { label: 'Nom', width: 130 },
      { label: 'Email', width: 150 },
      { label: 'Téléphone', width: 90 },
      { label: 'Statut', width: 65 },
      { label: 'Bien loué', width: 160 },
    ];
    tableHeader(doc, cols);

    tenants.forEach((t, i) => {
      const lease = ((t as unknown as { leasesAsTenant: Array<{ property: { address: string; city: string } }> }).leasesAsTenant)[0];
      tableRow(doc, [
        { value: truncate(`${t.firstName} ${t.lastName}`, 20), width: 130 },
        { value: truncate(t.email, 24), width: 150 },
        { value: truncate(t.phone, 14), width: 90 },
        { value: ACCOUNT_STATUS[t.accountStatus] ?? t.accountStatus, width: 65 },
        { value: lease ? truncate(`${lease.property.address}, ${lease.property.city}`, 26) : '—', width: 160 },
      ], i);
    });

    drawFooter(doc);
    doc.end();
    return done;
  }

  async rapportPDF(user: AuthenticatedUser, from?: string, to?: string): Promise<Buffer> {
    const where: Record<string, unknown> = { status: 'PAID' };
    if (user.role === 'OWNER') where['lease'] = { property: { ownerId: user.id } };
    if (user.role === 'MANAGER') where['lease'] = { property: { mandates: { some: { managerId: user.id, status: 'ACTIVE' } } } };
    if (from || to) {
      where['paidAt'] = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const payments = await this.prisma.payment.findMany({ where, take: 2000 });

    const byMonth: Record<string, { count: number; total: number }> = {};
    for (const p of payments) {
      const d = new Date(p.paidAt ?? p.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { count: 0, total: 0 };
      byMonth[key].count++;
      byMonth[key].total += p.paidAmount;
    }

    const sorted = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b));
    const grandTotal = payments.reduce((s, p) => s + p.paidAmount, 0);

    const { doc, done } = buildPdf();
    const subtitle = from && to ? `Période : ${fmtDate(from)} → ${fmtDate(to)}` : `Au ${fmtDate(new Date())}`;
    drawHeader(doc, 'Rapport financier mensuel', subtitle, `${payments.length} paiements confirmés`);
    doc.moveDown(0.5);

    const cols = [
      { label: 'Mois', width: 200 },
      { label: 'Nb paiements', width: 150, align: 'right' as const },
      { label: 'Total encaissé', width: 173, align: 'right' as const },
    ];
    tableHeader(doc, cols);

    sorted.forEach(([key, { count, total }], i) => {
      const [yr, mo] = key.split('-');
      tableRow(doc, [
        { value: `${MOIS_FR[Number(mo) - 1]} ${yr}`, width: 200, bold: true },
        { value: String(count), width: 150, align: 'right' },
        { value: fmtNum(total), width: 173, align: 'right' },
      ], i);
    });

    tableRow(doc, [
      { value: 'TOTAL', width: 200 },
      { value: String(payments.length), width: 150, align: 'right' },
      { value: fmtNum(grandTotal), width: 173, align: 'right', bold: true },
    ], 0, true);

    drawFooter(doc);
    doc.end();
    return done;
  }
}

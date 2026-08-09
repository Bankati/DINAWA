// Rapport mensuel consolidé par propriétaire mandant (voir /architect unité
// 33) — jamais par mandat individuel : un propriétaire ayant confié
// plusieurs biens au même gestionnaire reçoit un seul rapport les couvrant
// tous. Note libre et évolution du taux d'occupation retirées du périmètre.

interface PersonSummary {
  id: string;
  firstName: string;
  lastName: string;
}

interface PropertySummary {
  id: string;
  address: string;
}

export interface ReportPayment {
  id: string;
  paidAmount: number;
  paidAt: Date | null;
  paymentMethod: string | null;
}

export interface ReportPropertyPayments {
  property: PropertySummary;
  payments: ReportPayment[];
  totalReceived: number;
}

export interface ReportOverdueEntry {
  id: string;
  dueDate: Date;
  expectedAmount: number;
  paidAmount: number;
  property: PropertySummary;
  tenant: PersonSummary;
}

export interface ReportProcessedDeclaration {
  id: string;
  status: 'PAID' | 'REJECTED';
  paidAmount: number;
  processedAt: Date;
  property: PropertySummary;
  tenant: PersonSummary;
}

export interface ConsolidatedReportData {
  owner: PersonSummary & { email: string | null };
  manager: PersonSummary;
  periodLabel: string;
  periodStart: Date;
  periodEnd: Date;
  properties: PropertySummary[];
  paymentsByProperty: ReportPropertyPayments[];
  totalReceived: number;
  overdueEntries: ReportOverdueEntry[];
  processedDeclarations: ReportProcessedDeclaration[];
}

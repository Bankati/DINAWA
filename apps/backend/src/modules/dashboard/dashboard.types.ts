// Types partagés entre les DTOs et le service — voir /architect unité 32
// pour la définition exacte de chaque terme (biens gérés, périmètre...).

export enum DashboardPeriodType {
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

// « Bien géré » (MANAGED) = uniquement les biens sous mandat ACTIVE — jamais
// les biens propres du gestionnaire (voir /architect unité 32, vocabulaire
// validé). OWNED/ALL existent pour élargir ponctuellement la vue (ex.
// alertes, où le gestionnaire veut aussi voir ses propres biens).
export enum DashboardScope {
  MANAGED = 'MANAGED',
  OWNED = 'OWNED',
  ALL = 'ALL',
}

export interface ManagerDashboardSummary {
  totalManagedProperties: number;
  byStatus: Record<'OCCUPIED' | 'VACANT' | 'RENOVATION' | 'ARCHIVED', number>;
  mandatingOwnersCount: number;
}

export interface PeriodComparison {
  current: number;
  previous: number;
  changePercent: number | null;
}

export interface ManagerDashboardRevenue {
  period: { type: DashboardPeriodType; label: string };
  ownProperties: PeriodComparison;
  managedProperties: PeriodComparison;
  total: PeriodComparison;
}

export interface ManagerDashboardAlerts {
  overdueEntries: Array<{
    id: string;
    dueDate: Date;
    expectedAmount: number;
    paidAmount: number;
    property: { id: string; address: string };
    tenant: { id: string; firstName: string; lastName: string };
  }>;
  expiringLeases: Array<{
    id: string;
    endDate: Date | null;
    property: { id: string; address: string };
    tenant: { id: string; firstName: string; lastName: string };
  }>;
  pendingDeclarations: Array<{
    id: string;
    paidAmount: number;
    createdAt: Date;
    property: { id: string; address: string };
    tenant: { id: string; firstName: string; lastName: string };
  }>;
}

export interface ManagerDashboardOwner {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  managedPropertiesCount: number;
}

export interface ManagerDashboardUpcomingPayment {
  id: string;
  dueDate: Date;
  expectedAmount: number;
  paidAmount: number;
  property: { id: string; address: string };
  tenant: { id: string; firstName: string; lastName: string };
}

export interface ManagerDashboardPerformance {
  propertyId: string;
  periodMonths: 6;
  totalDueEntries: number;
  onTimeCount: number;
  onTimeRatePercent: number | null;
}

/**
 * Modèles alignés sur le backend réel (modules `payments` / `payment-declarations`
 * / `leases` — voir apps/backend/prisma/schema.prisma, modèles Payment et
 * PaymentScheduleEntry). À ne pas confondre avec l'ancien `paiement.model.ts`
 * (français, dérivé côté client) qui ne correspond à aucune route existante.
 */

export type PaymentStatus =
  | 'PENDING'
  | 'PENDING_CONFIRMATION'
  | 'PAID'
  | 'PARTIAL'
  | 'LATE'
  | 'OVERDUE'
  | 'REJECTED';

export type PaymentSource = 'CASHPAY_API' | 'MANUAL_OWNER' | 'TENANT_DECLARATION';

export type PaymentMethod = 'TMONEY' | 'FLOOZ' | 'CASH' | 'BANK_TRANSFER';

export type ManualPaymentMethod = 'CASH' | 'BANK_TRANSFER';

export interface PaymentScheduleEntry {
  id: string;
  leaseId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  expectedAmount: number;
  paidAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'LATE' | 'OVERDUE';
}

interface PersonSummary {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
}

interface PropertySummary {
  id: string;
  address: string;
  neighborhood: string;
  city: string;
}

export interface Payment {
  id: string;
  scheduleEntryId: string;
  scheduleEntry?: PaymentScheduleEntry;
  leaseId: string;
  lease?: {
    id: string;
    property: PropertySummary;
    owner: PersonSummary;
    tenant: PersonSummary;
  };
  source: PaymentSource;
  status: PaymentStatus;
  paymentMethod?: PaymentMethod | null;
  paidAmount: number;
  paidAt?: string | null;
  transactionId?: string | null;
  proofStoragePath?: string | null;
  note?: string | null;
  recordedByUserId?: string | null;
  confirmedByUserId?: string | null;
  confirmedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPayments {
  data: Payment[];
  page: number;
  limit: number;
  total: number;
}

export interface ListPaymentsQuery {
  page?: number;
  limit?: number;
  propertyId?: string;
  tenantUserId?: string;
  status?: PaymentStatus;
  source?: PaymentSource;
  from?: string;
  to?: string;
}

export interface CreateManualPaymentRequest {
  scheduleEntryId: string;
  paidAmount: number;
  paidAt: string;
  paymentMethod: ManualPaymentMethod;
  note?: string;
  proof?: File;
}

/** Historique des baux d'un bien — GET /properties/:propertyId/tenants/history */
export interface LeaseHistoryEntry {
  id: string;
  propertyId: string;
  property: PropertySummary;
  tenantUserId: string;
  tenant: PersonSummary;
  monthlyRent: number;
  monthlyCharges: number;
  paymentFrequency: 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL' | 'ANNUAL';
  startDate: string;
  endDate: string | null;
  securityDeposit: number;
  status: 'ACTIVE' | 'TERMINATED' | 'EXPIRED';
  terminatedAt: string | null;
  terminationReason: string | null;
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'En attente',
  PENDING_CONFIRMATION: 'À confirmer',
  PAID: 'Payé',
  PARTIAL: 'Partiel',
  LATE: 'En retard',
  OVERDUE: 'Impayé',
  REJECTED: 'Rejeté',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  TMONEY: 'T-Money',
  FLOOZ: 'Flooz',
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement bancaire',
};

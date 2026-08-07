import { api, getBlob } from "./api";

export type PaymentStatus =
  | "PENDING"
  | "PENDING_CONFIRMATION"
  | "PAID"
  | "PARTIAL"
  | "LATE"
  | "OVERDUE"
  | "REJECTED";
export type PaymentSource =
  "CASHPAY_API" | "MANUAL_OWNER" | "TENANT_DECLARATION";
export type PaymentMethod = "TMONEY" | "FLOOZ" | "CASH" | "BANK_TRANSFER";
// Le formulaire de saisie manuelle (propriétaire/gestionnaire) n'accepte que
// ces deux modes — T-Money/Flooz dépendent de Cashpay (webhook non construit).
export type ManualPaymentMethod = "CASH" | "BANK_TRANSFER";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "En attente",
  PENDING_CONFIRMATION: "À confirmer",
  PAID: "Payé",
  PARTIAL: "Partiel",
  LATE: "En retard",
  OVERDUE: "Impayé",
  REJECTED: "Rejeté",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  TMONEY: "T-Money",
  FLOOZ: "Flooz",
  CASH: "Espèces",
  BANK_TRANSFER: "Virement bancaire",
};

export const PAYMENT_STATUS_BADGE_CLASSES: Record<PaymentStatus, string> = {
  PAID: "bg-green-100 text-green-800",
  PARTIAL: "bg-yellow-100 text-yellow-800",
  LATE: "bg-orange-100 text-orange-800",
  OVERDUE: "bg-red-100 text-red-800",
  REJECTED: "bg-red-100 text-red-800",
  PENDING_CONFIRMATION: "bg-blue-50 text-blue-700",
  PENDING: "bg-gray-100 text-gray-800",
};

export const PAYMENT_STATUS_DOT_CLASSES: Record<PaymentStatus, string> = {
  PAID: "bg-green-500",
  PARTIAL: "bg-yellow-500",
  LATE: "bg-orange-500",
  OVERDUE: "bg-red-500",
  REJECTED: "bg-red-500",
  PENDING_CONFIRMATION: "bg-blue-400",
  PENDING: "bg-gray-500",
};

interface PersonSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

export interface Payment {
  id: string;
  leaseId: string;
  scheduleEntryId: string | null;
  source: PaymentSource;
  status: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  paidAmount: number;
  paidAt: string | null;
  transactionId: string | null;
  note: string | null;
  proofStoragePath: string | null;
  recordedByUserId: string | null;
  confirmedByUserId: string | null;
  confirmedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  lease?: {
    id: string;
    tenant?: PersonSummary;
    property?: {
      id: string;
      address: string;
      neighborhood: string;
      city: string;
    };
  };
}

export interface PaymentDeclaration {
  id: string;
  leaseId: string;
  scheduleEntryId: string;
  paidAmount: number;
  paymentMethod: string;
  note: string | null;
  proofStoragePath: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  lease?: {
    tenant?: {
      firstName: string;
      lastName: string;
      email: string;
    };
    property?: {
      address: string;
    };
  };
}

export interface CreatePaymentDeclarationDto {
  leaseId: string;
  scheduleEntryId: string;
  declaredAmount: number;
  paymentMethod: string;
  note?: string;
}

export interface RejectPaymentDto {
  rejectionReason: string;
}

export interface CreateManualPaymentDto {
  scheduleEntryId: string;
  paidAmount: number;
  paidAt: string;
  paymentMethod: ManualPaymentMethod;
  note?: string;
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

export interface PaginatedPayments {
  data: Payment[];
  page: number;
  limit: number;
  total: number;
}

export const paymentsApi = {
  // Créer une déclaration de paiement locataire
  createDeclaration: (dto: CreatePaymentDeclarationDto, file?: File) => {
    const formData = new FormData();
    formData.append("leaseId", dto.leaseId);
    formData.append("scheduleEntryId", dto.scheduleEntryId);
    formData.append("declaredAmount", dto.declaredAmount.toString());
    formData.append("paymentMethod", dto.paymentMethod);
    if (dto.note) formData.append("note", dto.note);
    if (file) formData.append("proof", file);
    return api.post<PaymentDeclaration>("/payment-declarations", formData);
  },

  // Déclarations locataires en attente de validation (propriétaire/gestionnaire)
  // — passe par GET /payments avec filtres source+status, pas de route dédiée.
  getPendingDeclarations: async (): Promise<PaymentDeclaration[]> => {
    const result = await api.get<{ data: PaymentDeclaration[]; total: number }>(
      "/payments?source=TENANT_DECLARATION&status=PENDING_CONFIRMATION",
    );
    return result.data;
  },

  // Historique des déclarations du locataire connecté
  getTenantDeclarations: async (): Promise<PaymentDeclaration[]> => {
    const result = await api.get<{ data: PaymentDeclaration[]; total: number }>(
      "/payments?source=TENANT_DECLARATION",
    );
    return result.data;
  },

  // Confirmer un paiement
  confirmPayment: (id: string) => api.post<Payment>(`/payments/${id}/confirm`),

  // Rejeter un paiement
  rejectPayment: (id: string, dto: RejectPaymentDto) =>
    api.post<Payment>(`/payments/${id}/reject`, dto),

  // Récupérer l'historique des paiements (propriétaire/gestionnaire/locataire)
  getPayments: (query?: ListPaymentsQuery): Promise<PaginatedPayments> => {
    const params = query
      ? "?" +
        new URLSearchParams(
          Object.entries(query)
            .filter(([, v]) => v != null && v !== "")
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : "";
    return api.get<PaginatedPayments>(`/payments${params}`);
  },

  // Télécharger la quittance PDF — réponse binaire, jamais du JSON
  downloadReceipt: (id: string) => getBlob(`/payments/${id}/receipt.pdf`),

  // Créer un paiement manuel (propriétaire/gestionnaire) — toujours PAID
  // immédiatement, source MANUAL_OWNER
  createManualPayment: (dto: CreateManualPaymentDto, file?: File) => {
    const formData = new FormData();
    formData.append("scheduleEntryId", dto.scheduleEntryId);
    formData.append("paidAmount", String(dto.paidAmount));
    formData.append("paidAt", dto.paidAt);
    formData.append("paymentMethod", dto.paymentMethod);
    if (dto.note) formData.append("note", dto.note);
    if (file) formData.append("proof", file);
    return api.post<Payment>("/payments/manual", formData);
  },
};

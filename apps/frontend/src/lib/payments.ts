import { api, API_URL } from "./api";

// Télécharge un fichier binaire authentifié (PDF, image) — api.get() ne retourne que du JSON.
async function fetchBlob(path: string): Promise<Blob> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("warah_access_token")
      : null;
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ message: `Erreur ${res.status}` }));
    throw new Error(err.message ?? `Erreur ${res.status}`);
  }
  return res.blob();
}

// Statut du reversement du loyer vers le propriétaire/gestionnaire — fourni
// seulement à eux (jamais au locataire), voir PaymentsService.findAll().
export type PayoutStatus = "PENDING" | "SENDING" | "SUCCESS" | "FAILED";

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  PENDING: "Reversement en attente",
  SENDING: "Reversement en cours",
  SUCCESS: "Reversé",
  FAILED: "Reversement en échec",
};

export const PAYOUT_STATUS_TONE: Record<
  PayoutStatus,
  "success" | "warning" | "error" | "info"
> = {
  PENDING: "warning",
  SENDING: "info",
  SUCCESS: "success",
  FAILED: "error",
};

export interface Payment {
  id: string;
  leaseId: string;
  scheduleEntryId: string | null;
  status: string;
  // Loyer seul — les frais de service payés en plus sont dans feeAmount.
  paidAmount: number;
  feeAmount?: number;
  payout?: {
    status: PayoutStatus;
    completedAt: string | null;
    amount: number;
  } | null;
  paymentMethod: string;
  note: string | null;
  proofStoragePath: string | null;
  createdAt: string;
  updatedAt: string;
  lease?: {
    id: string;
    tenant?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    property?: {
      id: string;
      address: string | null;
      city: string;
      // Mandat actif : le propriétaire voit alors le paiement en lecture
      // seule, seul le gestionnaire peut agir (canActOnProperty()).
      mandates?: {
        managerId: string;
        manager: { firstName: string; lastName: string };
      }[];
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
      address: string | null;
      // Mandat actif — voir Payment.lease.property.mandates.
      mandates?: {
        managerId: string;
        manager: { firstName: string; lastName: string };
      }[];
    };
  };
}

export interface CreatePaymentDeclarationDto {
  scheduleEntryId: string;
  declaredAmount: number;
  declaredAt: string;
  declaredMethod: "CASH";
  note?: string;
}

export interface RejectPaymentDto {
  rejectionReason: string;
}

export interface InitiatePaymentDto {
  scheduleEntryId: string;
  paymentMethod: "TMONEY" | "FLOOZ";
}

// Devis avant paiement en ligne : loyer + frais de service. payoutReady=false
// = le propriétaire/gestionnaire n'a pas de numéro de réception, le paiement
// serait refusé (voir GET /payments/quote/:scheduleEntryId).
export interface PaymentQuote {
  rentAmount: number;
  feeAmount: number;
  totalAmount: number;
  payoutReady: boolean;
}

export interface InitiatePaymentResponse {
  paymentId: string;
  checkoutUrl: string;
}

export type PaymentStatus =
  | "PENDING"
  | "PENDING_CONFIRMATION"
  | "PAID"
  | "LATE"
  | "REJECTED"
  | "CANCELLED";

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PENDING_CONFIRMATION: "À confirmer",
  PAID: "Payé",
  LATE: "En retard",
  REJECTED: "Rejeté",
  CANCELLED: "Annulé",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Espèces",
  TMONEY: "T-Money",
  FLOOZ: "Flooz",
};

export const PAYMENT_STATUS_BADGE_CLASSES: Record<string, string> = {
  PENDING: "badge-warning",
  PENDING_CONFIRMATION: "badge-info",
  PAID: "badge-success",
  LATE: "badge-danger",
  REJECTED: "badge-danger",
  CANCELLED: "badge-neutral",
};

export const PAYMENT_STATUS_DOT_CLASSES: Record<string, string> = {
  PENDING: "dot-warning",
  PENDING_CONFIRMATION: "dot-info",
  PAID: "dot-success",
  LATE: "dot-danger",
  REJECTED: "dot-danger",
  CANCELLED: "dot-neutral",
};

export const paymentsApi = {
  // Initier un vrai paiement mobile money (PayDunya) — renvoie l'URL de
  // paiement hébergée par PayDunya vers laquelle rediriger le locataire.
  initiate: (dto: InitiatePaymentDto) =>
    api.post<InitiatePaymentResponse>("/payments/initiate", dto),

  getQuote: (scheduleEntryId: string) =>
    api.get<PaymentQuote>(`/payments/quote/${scheduleEntryId}`),

  // Créer une déclaration de paiement locataire
  createDeclaration: (dto: CreatePaymentDeclarationDto, file?: File) => {
    const formData = new FormData();
    formData.append("scheduleEntryId", dto.scheduleEntryId);
    formData.append("declaredAmount", dto.declaredAmount.toString());
    formData.append("declaredAt", dto.declaredAt);
    formData.append("declaredMethod", dto.declaredMethod);
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

  // Récupérer l'historique des paiements
  getPayments: (query?: {
    leaseId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = query
      ? "?" +
        new URLSearchParams(
          Object.entries(query)
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : "";
    return api.get<{ data: Payment[]; total: number }>(`/payments${params}`);
  },

  // Télécharger la quittance PDF
  downloadReceipt: (id: string) => fetchBlob(`/payments/${id}/receipt.pdf`),

  // URL signée pour consulter la preuve d'une déclaration
  getProofUrl: (id: string) =>
    api.get<{ url: string }>(`/payment-declarations/${id}/proof`),

  // Créer un paiement manuel (propriétaire/gestionnaire)
  createManualPayment: (dto: Record<string, string | number>, file?: File) => {
    const formData = new FormData();
    Object.entries(dto).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    if (file) formData.append("proof", file);
    return api.post<Payment>("/payments/manual", formData);
  },
};

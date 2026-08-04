import { api } from './api';

export interface Payment {
  id: string;
  leaseId: string;
  scheduleEntryId: string | null;
  status: string;
  paidAmount: number;
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
      address: string;
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

export const paymentsApi = {
  // Créer une déclaration de paiement locataire
  createDeclaration: (dto: CreatePaymentDeclarationDto, file?: File) => {
    const formData = new FormData();
    formData.append('leaseId', dto.leaseId);
    formData.append('scheduleEntryId', dto.scheduleEntryId);
    formData.append('declaredAmount', dto.declaredAmount.toString());
    formData.append('paymentMethod', dto.paymentMethod);
    if (dto.note) formData.append('note', dto.note);
    if (file) formData.append('proof', file);
    return api.post<PaymentDeclaration>('/payment-declarations', formData);
  },

  // Déclarations locataires en attente de validation (propriétaire/gestionnaire)
  // — passe par GET /payments avec filtres source+status, pas de route dédiée.
  getPendingDeclarations: async (): Promise<PaymentDeclaration[]> => {
    const result = await api.get<{ data: PaymentDeclaration[]; total: number }>(
      '/payments?source=TENANT_DECLARATION&status=PENDING_CONFIRMATION',
    );
    return result.data;
  },

  // Historique des déclarations du locataire connecté
  getTenantDeclarations: async (): Promise<PaymentDeclaration[]> => {
    const result = await api.get<{ data: PaymentDeclaration[]; total: number }>(
      '/payments?source=TENANT_DECLARATION',
    );
    return result.data;
  },

  // Confirmer un paiement
  confirmPayment: (id: string) => 
    api.post<Payment>(`/payments/${id}/confirm`),

  // Rejeter un paiement
  rejectPayment: (id: string, dto: RejectPaymentDto) => 
    api.post<Payment>(`/payments/${id}/reject`, dto),

  // Récupérer l'historique des paiements
  getPayments: (query?: { leaseId?: string; status?: string; page?: number; limit?: number }) => {
    const params = query ? '?' + new URLSearchParams(Object.entries(query).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
    return api.get<{ data: Payment[]; total: number }>(`/payments${params}`);
  },

  // Télécharger la quittance PDF
  downloadReceipt: (id: string) => 
    api.get<Blob>(`/payments/${id}/receipt.pdf`),

  // Créer un paiement manuel (propriétaire/gestionnaire)
  createManualPayment: (dto: any, file?: File) => {
    const formData = new FormData();
    Object.keys(dto).forEach(key => {
      formData.append(key, dto[key]);
    });
    if (file) formData.append('proof', file);
    return api.post<Payment>('/payments/manual', formData);
  },
};

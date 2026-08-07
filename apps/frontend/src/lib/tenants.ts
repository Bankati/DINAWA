import { api } from "./api";

export type AccountStatus =
  "ACTIVE" | "SUSPENDED_INACTIVITY" | "SUSPENDED_ADMIN" | "SUSPENDED_PAYMENT";
export type LeaseStatus = "ACTIVE" | "TERMINATED" | "EXPIRED";
export type PaymentFrequency = "MONTHLY" | "QUARTERLY" | "BIANNUAL" | "ANNUAL";

export const LEASE_STATUS_LABELS: Record<LeaseStatus, string> = {
  ACTIVE: "Actif",
  TERMINATED: "Résilié",
  EXPIRED: "Expiré",
};

export const PAYMENT_FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  MONTHLY: "Mensuel",
  QUARTERLY: "Trimestriel",
  BIANNUAL: "Semestriel",
  ANNUAL: "Annuel",
};

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  ACTIVE: "Actif",
  SUSPENDED_INACTIVITY: "Suspendu — inactivité",
  SUSPENDED_ADMIN: "Suspendu — admin",
  SUSPENDED_PAYMENT: "Suspendu — paiement",
};

// Correspond à TenantSummary (GET /tenants[/:id])
export interface TenantSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: "TENANT";
  accountStatus: AccountStatus;
  createdAt: string;
  updatedAt: string;
  activeLease: { propertyId: string; address: string } | null;
}

// Correspond à LeaseHistoryEntry (GET /tenants/:id/leases/history)
export interface LeaseHistoryEntry {
  id: string;
  propertyId: string;
  property: { id: string; address: string; neighborhood: string; city: string };
  tenantUserId: string;
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  };
  monthlyRent: number;
  monthlyCharges: number;
  paymentFrequency: PaymentFrequency;
  startDate: string;
  endDate: string | null;
  securityDeposit: number;
  status: LeaseStatus;
  terminatedAt: string | null;
  terminationReason: string | null;
  createdAt: string;
}

export interface PaginatedLeaseHistory {
  data: LeaseHistoryEntry[];
  page: number;
  limit: number;
  total: number;
}

// Correspond à InviteTenantDto (POST /auth/invite/tenant) — invitation +
// création du bail en une seule opération, jamais de POST /tenants séparé.
export interface InviteTenantDto {
  propertyId: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  monthlyRent: number;
  monthlyCharges: number;
  paymentFrequency: PaymentFrequency;
  startDate: string;
  endDate?: string;
  securityDeposit: number;
  depositReturnConditions?: string;
  reminderDaysBefore?: number;
  overdueAlertWindowDays?: number;
}

export interface InviteTenantResponse {
  user: TenantSummary;
  lease: LeaseHistoryEntry;
  invitationUrl: string | null;
}

export const tenantsApi = {
  // Pas de filtre/pagination côté serveur — tout se fait côté client, comme
  // pour properties.list().
  list: () => api.get<TenantSummary[]>("/tenants"),

  getById: (id: string) => api.get<TenantSummary>(`/tenants/${id}`),

  getLeaseHistory: (tenantUserId: string, page = 1, limit = 20) =>
    api.get<PaginatedLeaseHistory>(
      `/tenants/${tenantUserId}/leases/history?page=${page}&limit=${limit}`,
    ),

  // Historique des baux d'un bien précis (tous locataires) — utilisé pour la
  // cascade bien → bail du formulaire de saisie manuelle de paiement.
  getPropertyLeaseHistory: (propertyId: string, limit = 100) =>
    api.get<PaginatedLeaseHistory>(
      `/properties/${propertyId}/tenants/history?limit=${limit}`,
    ),

  invite: (dto: InviteTenantDto) =>
    api.post<InviteTenantResponse>("/auth/invite/tenant", dto),
};

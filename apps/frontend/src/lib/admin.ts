import { api } from "./api";

// ── Types pour les vrais endpoints /admin/users ──
export interface AdminUser {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: "OWNER" | "MANAGER" | "TENANT" | "ADMIN";
  accountStatus:
    "ACTIVE" | "SUSPENDED_INACTIVITY" | "SUSPENDED_PAYMENT" | "SUSPENDED_ADMIN";
  city: string | null;
  createdAt: string;
  _count: { ownedProperties: number; leasesAsTenant: number };
}

export interface AdminUserDetail extends AdminUser {
  updatedAt: string;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  suspensionReason: string | null;
}

function toQueryString(
  params?: Record<string, string | number | undefined>,
): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, v]) => v != null);
  if (entries.length === 0) return "";
  return (
    "?" +
    new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()
  );
}

export interface AdminTransaction {
  id: string;
  source: "MANUAL_OWNER" | "TENANT_DECLARATION" | "CASHPAY_API";
  status: string;
  paymentMethod: string | null;
  paidAmount: number;
  paidAt: string | null;
  createdAt: string;
  lease: {
    tenant: { firstName: string; lastName: string };
    owner: { firstName: string; lastName: string };
    property: { address: string; city: string };
  };
}

export interface AdminAuditLogEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  actorUserId: string | null;
  actor: { firstName: string; lastName: string; role: string } | null;
}

export interface AdminTopOwner {
  id: string;
  firstName: string;
  lastName: string;
  totalPaidAmount: number;
}

export interface AdminTopManager {
  id: string;
  firstName: string;
  lastName: string;
  activeMandatesCount: number;
}

export const adminApi = {
  listUsers: (params?: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get<{ data: AdminUser[]; total: number; page: number; limit: number }>(
      `/admin/users${toQueryString(params)}`,
    ),
  getUser: (id: string) => api.get<AdminUserDetail>(`/admin/users/${id}`),
  deleteUser: (id: string) =>
    api.delete<{ message: string }>(`/admin/users/${id}`),
  suspendUser: (id: string, reason: string) =>
    api.post<{ message: string }>(`/admin/users/${id}/suspend`, { reason }),
  reactivateUser: (id: string) =>
    api.post<{ message: string }>(`/admin/users/${id}/reactivate`, {}),
  listTransactions: (params?: {
    source?: string;
    status?: string;
    paymentMethod?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get<{
      data: AdminTransaction[];
      total: number;
      page: number;
      limit: number;
    }>(`/admin/transactions${toQueryString(params)}`),
  listAuditLogs: (params?: {
    actorUserId?: string;
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get<{
      data: AdminAuditLogEntry[];
      total: number;
      page: number;
      limit: number;
    }>(`/admin/audit-logs${toQueryString(params)}`),
  topOwners: (limit?: number) =>
    api.get<AdminTopOwner[]>(`/admin/top-owners${toQueryString({ limit })}`),
  topManagers: (limit?: number) =>
    api.get<AdminTopManager[]>(
      `/admin/top-managers${toQueryString({ limit })}`,
    ),
};

export interface RepartitionBienType {
  type: string;
  montant: number;
  nombreBiens: number;
}

export interface StatistiquesPlateforme {
  nombreUtilisateurs: number;
  nombreBiens: number;
  volumeTransactionsMois: number;
  nombreLitigesOuverts: number;
  comptesSuspendus: number;
  mrr: number;
  tauxOccupation: number;
  croissanceUtilisateursMois: number;
  repartitionBiensParType: RepartitionBienType[];
  revenusMensuels: { mois: string; montant: number }[];
}

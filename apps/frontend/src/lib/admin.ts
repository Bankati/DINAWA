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
}

export const adminApi = {
  listUsers: (params?: {
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const qs = params
      ? "?" +
        new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : "";
    return api.get<{
      data: AdminUser[];
      total: number;
      page: number;
      limit: number;
    }>(`/admin/users${qs}`);
  },
  getUser: (id: string) => api.get<AdminUserDetail>(`/admin/users/${id}`),
  deleteUser: (id: string) =>
    api.delete<{ message: string }>(`/admin/users/${id}`),
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
  commissionsMois: number;
  nombreLitigesOuverts: number;
  tauxOccupation: number;
  croissanceUtilisateursMois: number;
  repartitionBiensParType: RepartitionBienType[];
  revenusMensuels: { mois: string; montant: number }[];
}

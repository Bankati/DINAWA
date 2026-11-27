import { api, API_URL, ApiError } from "./api";

// Artisans et pannes (Phase 13 — apps/backend/contexte/artisans-pannes.md).

export type ArtisanTrade =
  | "PLUMBER"
  | "ELECTRICIAN"
  | "MASON"
  | "CARPENTER"
  | "PAINTER"
  | "AIR_CONDITIONING"
  | "LOCKSMITH"
  | "GLAZIER"
  | "WELDER"
  | "TILER"
  | "OTHER";

export const TRADE_LABELS: Record<ArtisanTrade, string> = {
  PLUMBER: "Plomberie",
  ELECTRICIAN: "Électricité",
  MASON: "Maçonnerie",
  CARPENTER: "Menuiserie",
  PAINTER: "Peinture",
  AIR_CONDITIONING: "Climatisation",
  LOCKSMITH: "Serrurerie",
  GLAZIER: "Vitrerie",
  WELDER: "Soudure",
  TILER: "Carrelage",
  OTHER: "Autre",
};

export const TRADES = Object.keys(TRADE_LABELS) as ArtisanTrade[];

export type ArtisanDirectoryStatus = "PRIVATE" | "PUBLIC" | "REFUSED" | "SUSPENDED";

export const DIRECTORY_STATUS_LABELS: Record<ArtisanDirectoryStatus, string> = {
  PRIVATE: "Carnet privé",
  PUBLIC: "Dans l'annuaire",
  REFUSED: "A refusé l'annuaire",
  SUSPENDED: "Retiré par WARAH",
};

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export interface ArtisanContact {
  id: string;
  displayName: string;
  phone: string;
  trades: ArtisanTrade[];
  zones: string[];
  directoryStatus: ArtisanDirectoryStatus;
  verified: boolean;
  ratingAverage: number;
  ratingCount: number;
  privateNote: string | null;
  canEditDetails: boolean;
  addedAt: string;
  invitationPendingUntil: string | null;
}

export interface ArtisanInput {
  phone?: string;
  displayName?: string;
  trades?: ArtisanTrade[];
  zones?: string[];
  privateNote?: string;
}

export interface ArtisanInvitation {
  url: string;
  expiresAt: string;
  message: string;
  whatsappUrl: string | null;
}

export interface PublicArtisan {
  id: string;
  displayName: string;
  phone: string;
  trades: ArtisanTrade[];
  zones: string[];
  verified: boolean;
  ratingAverage: number;
  ratingCount: number;
}

export interface PublicArtisanDetail extends PublicArtisan {
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    authorName: string;
    trade: ArtisanTrade | null;
    createdAt: string;
  }>;
}

export interface ArtisanConsent {
  displayName: string;
  phoneMasked: string;
  trades: ArtisanTrade[];
  zones: string[];
  directoryStatus: ArtisanDirectoryStatus;
  invitedBy: string;
  expiresAt: string;
  notice: { version: string; text: string };
}

export interface AdminArtisan extends PublicArtisan {
  directoryStatus: ArtisanDirectoryStatus;
  suspensionReason: string | null;
  consentChangedAt: string | null;
  contactsCount: number;
  createdByName: string;
  createdAt: string;
}

export interface ArtisanFilters {
  page?: number;
  limit?: number;
  trade?: ArtisanTrade | "";
  zone?: string;
  search?: string;
  status?: ArtisanDirectoryStatus | "";
}

function qs(filters: Record<string, string | number | undefined | null>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

// ── Carnet (propriétaire / gestionnaire) ──
export const getArtisanContacts = (f: ArtisanFilters = {}) =>
  api.get<Paginated<ArtisanContact>>(`/artisans${qs({ ...f })}`);
export const createArtisan = (input: ArtisanInput) => api.post<ArtisanContact>("/artisans", input);
export const updateArtisan = (id: string, input: ArtisanInput) =>
  api.patch<ArtisanContact>(`/artisans/${id}`, input);
export const removeArtisan = (id: string) => api.delete<void>(`/artisans/${id}`);
export const inviteArtisan = (id: string) => api.post<ArtisanInvitation>(`/artisans/${id}/invitation`);

// ── Annuaire public (sans connexion) ──
// fetch direct : pas de jeton, pas de redirection vers la connexion.
async function publicRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = res.headers.get("content-type")?.includes("application/json")
    ? await res.json().catch(() => null)
    : null;
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export const getPublicArtisans = (f: ArtisanFilters = {}) =>
  publicRequest<Paginated<PublicArtisan>>(`/public/artisans${qs({ page: f.page, limit: f.limit, trade: f.trade, zone: f.zone, search: f.search })}`);
export const getPublicArtisan = (id: string) => publicRequest<PublicArtisanDetail>(`/public/artisans/${id}`);
export const getArtisanConsent = (token: string) =>
  publicRequest<ArtisanConsent>(`/public/artisan-consent/${encodeURIComponent(token)}`);
export const answerArtisanConsent = (token: string, decision: "ACCEPT" | "REFUSE", noticeVersion: string) =>
  publicRequest<{ directoryStatus: ArtisanDirectoryStatus }>(`/public/artisan-consent/${encodeURIComponent(token)}`, {
    method: "POST",
    body: JSON.stringify({ decision, noticeVersion }),
  });

// ── Admin ──
export const getAdminArtisans = (f: ArtisanFilters = {}) =>
  api.get<Paginated<AdminArtisan>>(`/admin/artisans${qs({ ...f })}`);
export const adminArtisanAction = (id: string, action: "verify" | "unverify" | "reinstate") =>
  api.post<unknown>(`/admin/artisans/${id}/${action}`);
export const adminSuspendArtisan = (id: string, reason: string) =>
  api.post<unknown>(`/admin/artisans/${id}/suspend`, { reason });

// ── Pannes ──
export type SupportRequestStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";
export type SupportRequestUrgency = "NORMAL" | "URGENT";

export const SUPPORT_STATUS_LABELS: Record<SupportRequestStatus, string> = {
  OPEN: "Signalée",
  ASSIGNED: "Artisan choisi",
  IN_PROGRESS: "En réparation",
  RESOLVED: "Réparée",
  CANCELLED: "Annulée",
};

export const SUPPORT_STATUS_TONES: Record<SupportRequestStatus, "warning" | "info" | "accent" | "success" | "neutral"> = {
  OPEN: "warning",
  ASSIGNED: "info",
  IN_PROGRESS: "accent",
  RESOLVED: "success",
  CANCELLED: "neutral",
};

export interface SupportRequestSummary {
  id: string;
  reference: string;
  status: SupportRequestStatus;
  urgency: SupportRequestUrgency;
  channel: "WEB" | "WHATSAPP";
  trade: ArtisanTrade | null;
  description: string;
  property: { id: string; label: string };
  tenantName: string;
  artisan: { id: string; displayName: string; phone: string; trades: ArtisanTrade[]; verified: boolean } | null;
  photosCount: number;
  createdAt: string;
  assignedAt: string | null;
  resolvedAt: string | null;
}

export interface SupportRequestDetail extends SupportRequestSummary {
  tenantPhone: string | null;
  photos: Array<{ id: string; url: string }>;
  startedAt: string | null;
  cancelledAt: string | null;
  costAmount: number | null;
  costPaidBy: "OWNER" | "TENANT" | null;
  resolutionNote: string | null;
  review: { rating: number; comment: string | null; createdAt: string } | null;
  canManage: boolean;
  artisanWhatsappUrl: string | null;
}

export interface SupportFilters {
  page?: number;
  limit?: number;
  status?: SupportRequestStatus | "";
}

// Locataire
export const getMySupportRequests = (f: SupportFilters = {}) =>
  api.get<Paginated<SupportRequestSummary>>(`/me/support-requests${qs({ ...f })}`);
export const getMySupportRequest = (id: string) => api.get<SupportRequestDetail>(`/me/support-requests/${id}`);
export const createSupportRequest = (form: FormData) => api.post<SupportRequestDetail>("/me/support-requests", form);
export const cancelMySupportRequest = (id: string) =>
  api.post<SupportRequestDetail>(`/me/support-requests/${id}/cancel`);

// Responsable du bien
export const getSupportRequests = (f: SupportFilters = {}) =>
  api.get<Paginated<SupportRequestSummary>>(`/support-requests${qs({ ...f })}`);
export const getSupportRequest = (id: string) => api.get<SupportRequestDetail>(`/support-requests/${id}`);
export const assignSupportRequest = (id: string, artisanId: string) =>
  api.post<SupportRequestDetail>(`/support-requests/${id}/assign`, { artisanId });
export const updateSupportRequestStatus = (
  id: string,
  body: { status: "IN_PROGRESS" | "RESOLVED" | "CANCELLED"; costAmount?: number; costPaidBy?: "OWNER" | "TENANT"; note?: string },
) => api.patch<SupportRequestDetail>(`/support-requests/${id}/status`, body);
export const reviewSupportRequest = (id: string, rating: number, comment?: string) =>
  api.post<SupportRequestDetail>(`/support-requests/${id}/review`, { rating, comment });

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const msg = (error.body as { message?: string | string[] } | null)?.message;
    if (Array.isArray(msg)) return msg.join(" · ");
    if (msg) return msg;
  }
  return error instanceof Error ? error.message : "Une erreur est survenue";
}

// « 90 12 34 56 » pour l'affichage.
export function formatPhone(phone: string): string {
  return phone.length === 8 ? phone.replace(/(\d{2})(?=\d)/g, "$1 ").trim() : phone;
}

export function whatsappLink(phone: string, text?: string): string {
  const number = phone.length === 8 ? `228${phone}` : phone.replace(/\D/g, "");
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

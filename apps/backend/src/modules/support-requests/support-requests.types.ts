import {
  ArtisanTrade,
  InterventionCostPayer,
  SupportRequestChannel,
  SupportRequestStatus,
  SupportRequestUrgency,
} from '@prisma/client';

export interface SupportRequestArtisan {
  id: string;
  displayName: string;
  phone: string;
  trades: ArtisanTrade[];
  verified: boolean;
}

export interface SupportRequestSummary {
  id: string;
  reference: string;
  status: SupportRequestStatus;
  urgency: SupportRequestUrgency;
  channel: SupportRequestChannel;
  trade: ArtisanTrade | null;
  description: string;
  property: { id: string; label: string };
  tenantName: string;
  artisan: SupportRequestArtisan | null;
  photosCount: number;
  createdAt: Date;
  assignedAt: Date | null;
  resolvedAt: Date | null;
}

export interface SupportRequestDetail extends SupportRequestSummary {
  tenantPhone: string | null;
  photos: Array<{ id: string; url: string }>;
  startedAt: Date | null;
  cancelledAt: Date | null;
  costAmount: number | null;
  costPaidBy: InterventionCostPayer | null;
  resolutionNote: string | null;
  review: { rating: number; comment: string | null; createdAt: Date } | null;
  // Côté responsable seulement : modifier, et texte prérempli pour prévenir
  // l'artisan depuis son propre WhatsApp (null côté locataire).
  canManage: boolean;
  artisanWhatsappUrl: string | null;
}

export interface PaginatedSupportRequests {
  data: SupportRequestSummary[];
  page: number;
  limit: number;
  total: number;
}

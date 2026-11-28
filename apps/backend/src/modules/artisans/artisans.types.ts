import { ArtisanDirectoryStatus, ArtisanTrade } from '@prisma/client';

export interface ArtisanContactView {
  // Id de l'artisan (pas de la ligne du carnet) : c'est lui qu'on choisit
  // pour une panne.
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
  // Nom, métiers et quartiers modifiables par cet utilisateur : seulement
  // le créateur, tant que la fiche n'est pas publique.
  canEditDetails: boolean;
  addedAt: Date;
  invitationPendingUntil: Date | null;
}

export interface PaginatedArtisanContacts {
  data: ArtisanContactView[];
  page: number;
  limit: number;
  total: number;
}

export interface PublicArtisanSummary {
  id: string;
  displayName: string;
  // null pour un visiteur non connecté : le numéro n'est montré qu'aux
  // propriétaires et gestionnaires connectés (et à l'admin).
  phone: string | null;
  trades: ArtisanTrade[];
  zones: string[];
  verified: boolean;
  ratingAverage: number;
  ratingCount: number;
}

export interface PaginatedPublicArtisans {
  data: PublicArtisanSummary[];
  page: number;
  limit: number;
  total: number;
}

export interface PublicArtisanReview {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string;
  trade: ArtisanTrade | null;
  createdAt: Date;
}

export interface PublicArtisanDetail extends PublicArtisanSummary {
  reviews: PublicArtisanReview[];
}

export interface ArtisanInvitationView {
  // Page d'accord à ouvrir par l'artisan.
  url: string;
  expiresAt: Date;
  // Texte prêt à envoyer, et lien wa.me qui ouvre la conversation avec
  // l'artisan depuis le WhatsApp du propriétaire (null si numéro inutilisable).
  message: string;
  whatsappUrl: string | null;
}

export interface ArtisanConsentView {
  displayName: string;
  // Jamais le numéro complet sur une page ouverte par un simple lien.
  phoneMasked: string;
  trades: ArtisanTrade[];
  zones: string[];
  directoryStatus: ArtisanDirectoryStatus;
  invitedBy: string;
  expiresAt: Date;
  notice: { version: string; text: string };
}

export interface AdminArtisanView extends PublicArtisanSummary {
  phone: string;
  directoryStatus: ArtisanDirectoryStatus;
  suspensionReason: string | null;
  consentChangedAt: Date | null;
  contactsCount: number;
  createdByName: string;
  createdAt: Date;
}

export interface PaginatedAdminArtisans {
  data: AdminArtisanView[];
  page: number;
  limit: number;
  total: number;
}

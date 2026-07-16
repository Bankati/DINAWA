// Aligné sur les modèles User + Lease du backend (Prisma)

// Statuts du bail — correspondent à LeaseStatus de Prisma
export type LeaseStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
export type PaymentFrequency = 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL' | 'ANNUAL';

export const LEASE_STATUS_LABELS: Record<LeaseStatus, string> = {
  ACTIVE: 'Actif',
  EXPIRED: 'Expiré',
  TERMINATED: 'Résilié',
};

export const PAYMENT_FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  BIANNUAL: 'Semestriel',
  ANNUAL: 'Annuel',
};

// Profil du locataire — correspond au User de rôle TENANT retourné par le backend
export interface Locataire {
  id: string;            // User.id
  email?: string | null;
  phone?: string | null;
  firstName: string;
  lastName: string;
  role: 'TENANT';
  accountStatus: string;
  createdAt: string;
  updatedAt: string;
}

// Bail immobilier — correspond au modèle Lease de Prisma
export interface Bail {
  id: string;
  propertyId: string;
  ownerId: string;
  tenantUserId: string;
  monthlyRent: number;
  monthlyCharges: number;
  paymentFrequency: PaymentFrequency;
  startDate: string;
  endDate?: string | null;
  securityDeposit: number;
  depositReturnConditions?: string | null;
  reminderDaysBefore?: number | null;
  overdueAlertWindowDays?: number | null;
  status: LeaseStatus;
  terminatedAt?: string | null;
  terminationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Vue combinée utilisée dans les listes — Bail enrichi avec le nom du locataire
export interface BailAvecLocataire extends Bail {
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string | null;
  };
  property: {
    id: string;
    address: string;
    neighborhood: string;
    city: string;
  };
}

// DTO pour inviter un locataire — correspond à InviteTenantDto du backend
export interface InviteLocataireRequest {
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  propertyId: string;
}

// Réponse de POST /api/auth/invite-tenant
export interface InviteLocataireResponse {
  user: Locataire;
  invitationUrl: string;
}

// DTO pour créer un bail — correspond à CreateLeaseDto du backend
export interface CreateBailRequest {
  propertyId: string;
  tenantId: string;    // User.id du locataire existant
  monthlyRent: number;
  monthlyCharges: number;
  paymentFrequency: PaymentFrequency;
  startDate: string;   // ISO 8601
  endDate?: string;
  securityDeposit: number;
  depositReturnConditions?: string;
  reminderDaysBefore?: number;
  overdueAlertWindowDays?: number;
}

// DTO pour résilier un bail — correspond à TerminateLeaseDto du backend
export interface TerminateBailRequest {
  reason: string;
}

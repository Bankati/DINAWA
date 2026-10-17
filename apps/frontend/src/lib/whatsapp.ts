import { api } from './api';

// Canal WhatsApp — consentement, numéro vérifié et code locataire (backend
// unité 45). Règle à garder en tête côté écran : l'agence peut seulement
// DEMANDER l'accord (→ « en attente »), seul le locataire l'active (réponse
// « OUI », son espace, « REPRENDRE »), et rien ne part tant que son numéro
// n'a pas écrit à WARAH.

export type WhatsappConsent = 'NOT_ASKED' | 'PENDING' | 'ACCEPTED' | 'STOPPED';
export type WhatsappConsentMethod = 'IN_PERSON' | 'PHONE' | 'WRITTEN';

export interface WhatsappStatus {
  consent: WhatsappConsent;
  whatsappPhone: string | null;
  phoneVerified: boolean;
  requestExpiresAt: string | null;
  requestExpired: boolean;
  consentAt: string | null;
  stoppedAt: string | null;
  pinSet: boolean;
  contactLink: string | null;
  // Textes d'accord servis par le backend (seule source, version gardée en
  // preuve) — jamais recopiés ici.
  notice: { version: string; agencyAttestation: string; tenantNotice: string };
}

export const COLLECTION_METHOD_LABELS: Record<WhatsappConsentMethod, string> = {
  IN_PERSON: 'En personne',
  PHONE: 'Par téléphone',
  WRITTEN: 'Par écrit',
};

// En attente d'un message du locataire (« OUI » à une demande en cours, ou
// premier message qui vérifie le numéro) : l'écran interroge le serveur
// toutes les quelques secondes pour se mettre à jour tout seul.
export const WHATSAPP_WAITING_REFRESH_MS = 4000;

export function isWaitingForTenant(status: WhatsappStatus | undefined): boolean {
  if (!status) return false;
  return (status.consent === 'PENDING' && !status.requestExpired) || (status.consent === 'ACCEPTED' && !status.phoneVerified);
}

type BadgeTone = 'neutral' | 'success' | 'warning' | 'error' | 'info';

// Badge unique pour la liste, la fenêtre de l'agence et l'espace locataire.
export function whatsappBadge(status: { consent: WhatsappConsent; phoneVerified: boolean; requestExpired?: boolean }): {
  label: string;
  tone: BadgeTone;
} {
  switch (status.consent) {
    case 'ACCEPTED':
      return status.phoneVerified
        ? { label: 'WhatsApp actif', tone: 'success' }
        : { label: 'Accepté — numéro à vérifier', tone: 'info' };
    case 'PENDING':
      return status.requestExpired
        ? { label: 'Demande expirée', tone: 'warning' }
        : { label: 'En attente du locataire', tone: 'warning' };
    case 'STOPPED':
      return { label: 'Arrêté par le locataire', tone: 'error' };
    default:
      return { label: 'WhatsApp non activé', tone: 'neutral' };
  }
}

// --- Agence ---

export const tenantWhatsappKey = (tenantId: string) => ['tenant-whatsapp', tenantId] as const;

export function getTenantWhatsapp(tenantId: string) {
  return api.get<WhatsappStatus>(`/tenants/${tenantId}/whatsapp`);
}

export function requestTenantConsent(
  tenantId: string,
  body: { whatsappPhone: string; collectionMethod: WhatsappConsentMethod; attestation: true },
) {
  return api.patch<WhatsappStatus>(`/tenants/${tenantId}/whatsapp-consent`, body);
}

export function recordTenantRefusal(tenantId: string, collectionMethod: WhatsappConsentMethod) {
  return api.post<WhatsappStatus>(`/tenants/${tenantId}/whatsapp-consent/refusal`, { collectionMethod });
}

export function changeTenantWhatsappPhone(tenantId: string, whatsappPhone: string) {
  return api.patch<WhatsappStatus>(`/tenants/${tenantId}/whatsapp-phone`, { whatsappPhone });
}

export function resetTenantPin(tenantId: string) {
  return api.post<WhatsappStatus>(`/tenants/${tenantId}/whatsapp-pin/reset`);
}

// --- Espace locataire ---

export const MY_WHATSAPP_KEY = ['my-whatsapp'] as const;

export function getMyWhatsapp() {
  return api.get<WhatsappStatus>('/me/whatsapp');
}

export function setMyConsent(action: 'ACCEPT' | 'WITHDRAW', whatsappPhone?: string) {
  return api.patch<WhatsappStatus>('/me/whatsapp-consent', { action, ...(whatsappPhone ? { whatsappPhone } : {}) });
}

export function changeMyWhatsappPhone(whatsappPhone: string) {
  return api.patch<WhatsappStatus>('/me/whatsapp-phone', { whatsappPhone });
}

export function generateMyPin() {
  return api.post<{ pin: string }>('/me/whatsapp-pin');
}

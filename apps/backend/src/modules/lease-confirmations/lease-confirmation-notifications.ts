import { NotifyUserParams } from '../notify/notify.service';
import { formatPropertyLocation } from '../../common/utils/format-property-location';

// Codes cachés des boutons WhatsApp de la demande (contrat d'API du
// 09/11/2026). Meta les renvoie tels quels quand le locataire appuie ; le
// robot les lit avec parseLeaseConfirmationReply().
export const LEASE_CONFIRMATION_ACCEPT_PREFIX = 'LC_ACCEPT:';
export const LEASE_CONFIRMATION_REFUSE_PREFIX = 'LC_REFUSE:';

type PropertyLabel = { address: string | null; neighborhood: string; city: string };

// Dates civiles de Lomé (UTC+0 toute l'année) : jamais l'heure locale du
// serveur.
export function formatUtcDay(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

// Demande d'accord envoyée au locataire (et ses rappels à 2 et 5 jours).
// Toujours par email (forceEmail : l'email part même si le locataire a des
// notifications push) + ligne dans l'historique de l'application ; WhatsApp
// en plus quand c'est permis (NotifyService, modèle confirmation_logement).
// tenantFirstName = le prénom du COMPTE : le message va à son titulaire.
export function leaseConfirmationRequestNotification(input: {
  confirmationId: string;
  tenantUserId: string;
  tenantFirstName: string;
  inviterName: string;
  property: PropertyLabel & { id: string };
  monthlyRent: number;
  startDate: Date;
  expiresAt: Date;
  frontendUrl: string;
  isReminder: boolean;
}): NotifyUserParams {
  return {
    userId: input.tenantUserId,
    event: 'lease-confirmation-request',
    forceEmail: true,
    relatedTo: { propertyId: input.property.id },
    variables: {
      tenantFirstName: input.tenantFirstName,
      inviterName: input.inviterName,
      propertyAddress: formatPropertyLocation(input.property),
      monthlyRent: input.monthlyRent,
      startDate: formatUtcDay(input.startDate),
      expiresAt: formatUtcDay(input.expiresAt),
      // Page WARAH, jamais un lien qui valide seul (contrat, « Lien dans
      // l'email ») : le locataire répond d'un appui dans le bandeau.
      actionUrl: `${input.frontendUrl}/locataire`,
      isReminder: input.isReminder ? 1 : 0,
      acceptPayload: `${LEASE_CONFIRMATION_ACCEPT_PREFIX}${input.confirmationId}`,
      refusePayload: `${LEASE_CONFIRMATION_REFUSE_PREFIX}${input.confirmationId}`,
    },
  };
}

// Réponse ou expiration, envoyée à la personne qui a invité. Le nom est
// toujours celui qu'elle a tapé, jamais celui du compte (contrat d'API).
export function leaseConfirmationOutcomeNotification(input: {
  event: 'lease-confirmation-accepted' | 'lease-confirmation-refused' | 'lease-confirmation-expired';
  inviterUserId: string;
  typedFirstName: string;
  typedLastName: string;
  property: PropertyLabel;
  listingRepublished: boolean;
}): NotifyUserParams {
  return {
    userId: input.inviterUserId,
    event: input.event,
    variables: {
      tenantName: `${input.typedFirstName} ${input.typedLastName}`,
      tenantFirstName: input.typedFirstName,
      propertyAddress: formatPropertyLocation(input.property),
      listingRepublished: input.listingRepublished ? 1 : 0,
    },
  };
}

import { EmailTemplate } from '../email/templates/template-registry';
import { TemplateVariables } from '../email/templates/types';
import { PushPayload } from '../push/web-push.service';

// Même vocabulaire que les templates email (Unité 04) — un seul identifiant
// partout, sauf les 2 emails d'authentification qui ne passent jamais par
// NotifyService (voir architecture.md, invariant #7).
export type NotificationEvent = Exclude<
  EmailTemplate,
  'signup-confirmation' | 'password-reset-otp'
>;

type PushContentTemplate = { title: string; body: string; url: string };

const PUSH_CONTENT: Record<NotificationEvent, PushContentTemplate> = {
  receipt: {
    title: 'Quittance disponible',
    body: 'Votre paiement de {period} a été confirmé.',
    url: '/dashboard/payments',
  },
  'payment-reminder': {
    title: 'Rappel de loyer',
    body: 'Échéance à venir le {dueDate}.',
    url: '/dashboard/payments',
  },
  'overdue-alert': {
    title: 'Loyer impayé',
    body: "{tenantName} n'a pas encore payé pour {propertyAddress}.",
    url: '/dashboard/payments',
  },
  'payment-declaration-pending': {
    title: 'Paiement à confirmer',
    body: '{tenantName} a déclaré un paiement pour {propertyAddress}.',
    url: '/dashboard/payments',
  },
  'monthly-report': {
    title: 'Rapport mensuel disponible',
    body: 'Votre rapport pour {period} est prêt.',
    url: '/dashboard/reports',
  },
  'listing-contact': {
    title: 'Nouveau contact annonce',
    body: '{candidateName} est intéressé(e) par {listingAddress}.',
    url: '/dashboard/listings',
  },
  'inactivity-warning': {
    title: 'Compte bientôt suspendu',
    body: 'Il vous reste {daysRemaining} jours avant suspension.',
    url: '/dashboard/account',
  },
  'account-suspended': {
    title: 'Compte suspendu',
    body: 'Votre compte a été suspendu : {reason}.',
    url: '/dashboard/account',
  },
  'account-reactivated': {
    title: 'Compte réactivé',
    body: 'Votre compte WARAH est de nouveau pleinement actif.',
    url: '/dashboard/account',
  },
  'tenant-invitation': {
    title: 'Invitation WARAH',
    body: '{inviterName} vous invite à rejoindre WARAH.',
    url: '/dashboard',
  },
  'lease-created': {
    title: 'Nouveau bail',
    body: 'Vous avez un nouveau bail pour {propertyAddress}.',
    url: '/dashboard/leases',
  },
};

function interpolate(template: string, variables: TemplateVariables): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in variables ? String(variables[key]) : match,
  );
}

export function renderPushContent(
  event: NotificationEvent,
  variables: TemplateVariables,
): PushPayload {
  const content = PUSH_CONTENT[event];
  return {
    title: content.title,
    body: interpolate(content.body, variables),
    url: content.url,
  };
}

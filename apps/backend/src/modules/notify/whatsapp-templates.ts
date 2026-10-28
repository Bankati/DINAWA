import { TemplateVariables } from '../email/templates/types';
import { WhatsappTemplateName } from '../whatsapp-channel/whatsapp.service';
import { NotificationEvent } from './notification-events';

// Modèles Meta des notifications WhatsApp (unité 46, /architect 2026-10-16,
// décision 1) — seule table qui relie un événement à un modèle. Pure
// configuration : NotifyService choisit les canaux, WhatsappService envoie.
//
// Le VRAI contrat est le texte publié chez Meta : `metaText` garde le texte
// exact soumis (même nombre et même ordre de {{n}}), et les tests vérifient
// que `body` remplit exactement ces trous. Tout changement ici doit être
// re-soumis à Meta (sinon erreur 132000 : nombre de paramètres).

export type WhatsappTemplateSpec = {
  name: WhatsappTemplateName;
  // Variables NOMMÉES de la notification, dans l'ordre des {{1}}, {{2}}...
  // du corps publié chez Meta. Jamais de liste anonyme côté appelant.
  body: readonly BodyField[];
  // Bouton URL : base fixée chez Meta (https://warahcontact.com/payer/{{1}}),
  // le code n'envoie que la partie variable (le jeton du lien de paiement).
  button?: { variable: string };
  // PDF en en-tête (quittance) : la première pièce jointe de l'email, déjà
  // générée en mémoire — jamais stockée (invariant #5).
  document?: { filename: string };
  // Nouvel essai automatique sur refus temporaire (décision 2). false pour
  // la quittance : le PDF n'est pas stocké, l'email et le robot couvrent.
  retry: boolean;
  metaText: string;
};

type BodyField = { variable: string; format?: 'amount' | 'date' };

const REMINDER: WhatsappTemplateSpec = {
  name: 'rappel_loyer',
  body: [
    { variable: 'tenantFirstName' },
    { variable: 'amount', format: 'amount' },
    { variable: 'propertyAddress' },
    { variable: 'dueDate', format: 'date' },
  ],
  button: { variable: 'payToken' },
  retry: true,
  metaText:
    'Bonjour {{1}}, votre loyer de {{2}} FCFA pour {{3}} est à régler avant le {{4}}. ' +
    'Vous pouvez payer par Flooz ou Mixx by Yas avec le bouton ci-dessous.',
};

const RECEIPT: WhatsappTemplateSpec = {
  name: 'paiement_recu',
  body: [{ variable: 'tenantFirstName' }, { variable: 'amount', format: 'amount' }, { variable: 'period' }],
  document: { filename: 'quittance-warah.pdf' },
  retry: false,
  metaText:
    'Bonjour {{1}}, nous confirmons la réception de votre paiement de {{2}} FCFA pour la période {{3}}. ' +
    'Votre quittance est jointe à ce message.',
};

const TENANT_OVERDUE: WhatsappTemplateSpec = {
  name: 'loyer_en_retard',
  body: [
    { variable: 'tenantFirstName' },
    { variable: 'amount', format: 'amount' },
    { variable: 'propertyAddress' },
    { variable: 'dueDate', format: 'date' },
  ],
  button: { variable: 'payToken' },
  retry: true,
  metaText:
    'Bonjour {{1}}, votre loyer de {{2}} FCFA pour {{3}}, attendu le {{4}}, n’est pas encore réglé. ' +
    'Vous pouvez payer par Flooz ou Mixx by Yas avec le bouton ci-dessous.',
};

// Record exhaustif : un événement ajouté à NotificationEvent sans être
// listé ici ne compile pas. null = pas de WhatsApp, choix explicite.
export const WHATSAPP_TEMPLATES: Record<NotificationEvent, WhatsappTemplateSpec | null> = {
  'payment-reminder': REMINDER,
  receipt: RECEIPT,
  'tenant-overdue': TENANT_OVERDUE,
  // Destiné au responsable du bien, jamais à un locataire.
  'whatsapp-message': null,
  'overdue-alert': null,
  'payment-declaration-pending': null,
  'payment-rejected': null,
  'monthly-report': null,
  'inactivity-warning': null,
  'account-suspended': null,
  'account-reactivated': null,
  'tenant-invitation': null,
  'lease-created': null,
  'mandate-created': null,
  'payout-account-required': null,
  'payout-account-changed': null,
  'payout-sent': null,
  'payout-failed': null,
  'payout-failed-admin': null,
  'subscription-invoice-due': null,
};

// Modèles autorisés à un nouvel essai — lu par la tâche whatsapp-retry,
// jamais déduit de WhatsappMessage.retryable (un téléversement de PDF raté
// y est marqué réessayable, alors que la quittance ne doit pas l'être).
export const RETRYABLE_TEMPLATE_NAMES: readonly WhatsappTemplateName[] = Object.values(WHATSAPP_TEMPLATES)
  .filter((spec): spec is WhatsappTemplateSpec => spec !== null && spec.retry)
  .map((spec) => spec.name);

// Limite prudente par trou : la limite exacte dépend du modèle approuvé
// chez Meta (à revérifier sur le modèle réel avant la production).
export const MAX_TEMPLATE_PARAM_LENGTH = 200;

export type BuiltTemplate =
  | { ok: true; bodyParams: string[]; buttonParam?: string }
  | { ok: false; missing: string[] };

// Remplit les trous à partir des variables nommées. Une variable absente ou
// vide → aucun WhatsApp (Meta refuserait un paramètre vide), signalé par
// l'appelant ; l'email part quand même.
export function buildTemplate(spec: WhatsappTemplateSpec, variables: TemplateVariables): BuiltTemplate {
  const missing: string[] = [];
  const read = (name: string): string => {
    const value = variables[name];
    // Meta refuse un trou contenant un retour à la ligne, une tabulation ou
    // plus de 4 espaces à la suite (adresse copiée-collée…) : tout blanc
    // devient un espace simple (/review unité 46).
    const text = value === undefined || value === null ? '' : String(value).replace(/\s+/g, ' ').trim();
    if (!text) missing.push(name);
    return text;
  };

  const bodyParams = spec.body.map((field) => truncate(formatField(read(field.variable), field.format)));
  const buttonParam = spec.button ? read(spec.button.variable) : undefined;
  if (missing.length > 0) return { ok: false, missing };
  return buttonParam === undefined ? { ok: true, bodyParams } : { ok: true, bodyParams, buttonParam };
}

function truncate(value: string): string {
  return value.length > MAX_TEMPLATE_PARAM_LENGTH ? `${value.slice(0, MAX_TEMPLATE_PARAM_LENGTH - 1)}…` : value;
}

function formatField(value: string, format: BodyField['format']): string {
  if (!value) return value;
  if (format === 'amount') {
    const amount = Number(value);
    return Number.isNaN(amount) ? value : amount.toLocaleString('fr-FR');
  }
  // Dates ISO (2026-10-31) → 31/10/2026, comme sur les quittances.
  if (format === 'date') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  }
  return value;
}

import { InteractiveListRow } from '../whatsapp-channel/whatsapp-cloud.client';
import { normalizeKeywordText } from '../whatsapp-webhook/consent-keyword';

// Tous les textes du robot WhatsApp (unité 47) — un seul endroit pour les
// relire et les faire évoluer. Uniquement du service, jamais de publicité.

export type BotChoice = 'MENU' | 'PAY' | 'RECEIPT' | 'STATEMENT' | 'AGENT';

// Lignes du menu cliquable (limites Meta : titre 24 caractères, description
// 72). L'identifiant revient tel quel par le webhook (list_reply.id).
export const MENU_ROWS: InteractiveListRow[] = [
  {
    id: 'PAY',
    title: 'Payer mon loyer',
    description: 'Recevoir le lien de paiement Flooz ou Mixx by Yas',
  },
  {
    id: 'RECEIPT',
    title: 'Ma dernière quittance',
    description: 'Le PDF de votre dernier paiement (code demandé)',
  },
  {
    id: 'STATEMENT',
    title: 'Mon relevé',
    description: 'Vos 6 derniers mois de loyer (code demandé)',
  },
  {
    id: 'AGENT',
    // « Contacter mon gestionnaire » dépasse les 24 caractères du titre.
    title: 'Mon gestionnaire',
    description: 'Contacter mon gestionnaire : une personne vous répond',
  },
];
export const MENU_BUTTON = 'Voir les options';

// Mots tapés reconnus (message entier, sans accents ni majuscules — même
// traitement que STOP / OUI). Pas d'intelligence artificielle.
const KEYWORDS: ReadonlyMap<string, BotChoice> = new Map<string, BotChoice>([
  ...['menu', 'bonjour', 'bonsoir', 'salut', 'bjr', 'slt', 'hello', 'aide', 'oui', '0'].map(
    (word): [string, BotChoice] => [word, 'MENU'],
  ),
  ...['payer', 'payer mon loyer', 'paiement', 'loyer', '1'].map((word): [string, BotChoice] => [
    word,
    'PAY',
  ]),
  ...['quittance', 'ma quittance', 'ma derniere quittance', 'derniere quittance', '2'].map(
    (word): [string, BotChoice] => [word, 'RECEIPT'],
  ),
  ...['releve', 'mon releve', 'historique', '3'].map((word): [string, BotChoice] => [
    word,
    'STATEMENT',
  ]),
  ...['gestionnaire', 'contacter mon gestionnaire', 'agence', '4'].map(
    (word): [string, BotChoice] => [word, 'AGENT'],
  ),
]);

// Pendant un échange avec le gestionnaire (unité 48, décision 1), seules ces
// commandes rendent la main au robot : « bonjour », « oui » ou un chiffre
// sont des messages normaux destinés au gestionnaire.
const HUMAN_EXIT_KEYWORDS: ReadonlyMap<string, BotChoice> = new Map<string, BotChoice>([
  ['menu', 'MENU'],
  ...['payer', 'payer mon loyer'].map((word): [string, BotChoice] => [word, 'PAY']),
  ...['quittance', 'ma quittance', 'ma derniere quittance', 'derniere quittance'].map(
    (word): [string, BotChoice] => [word, 'RECEIPT'],
  ),
  ...['releve', 'mon releve'].map((word): [string, BotChoice] => [word, 'STATEMENT']),
]);
const LIST_REPLY_IDS: ReadonlySet<string> = new Set(['PAY', 'RECEIPT', 'STATEMENT', 'AGENT']);

export function parseBotChoice(text: string | null, replyId: string | null): BotChoice | null {
  if (replyId && LIST_REPLY_IDS.has(replyId)) return replyId as BotChoice;
  if (!text) return null;
  return KEYWORDS.get(normalizeKeywordText(text)) ?? null;
}

// Commande qui met fin à l'échange humain (choix dans la liste ou mot seul).
export function parseHumanExit(text: string | null, replyId: string | null): BotChoice | null {
  if (replyId && LIST_REPLY_IDS.has(replyId)) return replyId as BotChoice;
  if (!text) return null;
  return HUMAN_EXIT_KEYWORDS.get(normalizeKeywordText(text)) ?? null;
}

export const BOT_TEXTS = {
  menu: (firstName: string): string => `Bonjour ${firstName} ! Que voulez-vous faire ?`,
  notUnderstood: "Je n'ai pas compris. Que voulez-vous faire ?",
  invitation:
    "Bonjour ! Pour utiliser l'assistant WARAH (paiement du loyer, quittances), répondez OUI. " +
    'Vous pourrez arrêter à tout moment en répondant STOP.',
  pay: (amount: string, dueDate: string, url: string): string =>
    `Votre loyer de ${amount} est à régler avant le ${dueDate}.\n\nPayez par Flooz ou Mixx by Yas ici :\n${url}`,
  payOverdue: (amount: string, dueDate: string, url: string): string =>
    `Votre loyer de ${amount}, attendu le ${dueDate}, n'est pas encore réglé.\n\nPayez par Flooz ou Mixx by Yas ici :\n${url}`,
  upToDate: 'Vous êtes à jour ✅ Aucun loyer à payer pour le moment.',
  payLinkExpired:
    'Ce loyer est en retard depuis plus de 30 jours : le paiement en ligne n’est plus possible. ' +
    'Merci de contacter votre agence.',
  askPin: 'Pour votre sécurité, envoyez votre code WARAH à 6 chiffres.',
  askPinAgain: 'J’attends votre code à 6 chiffres. Écrivez « menu » pour revenir au menu.',
  wrongPin: (remaining: number): string =>
    `Code incorrect. Il vous reste ${remaining} essai${remaining > 1 ? 's' : ''} avant un blocage d’une heure.`,
  locked: (minutes: number): string =>
    `Trop d’essais : le code est bloqué. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`,
  noPin:
    'Pour voir vos quittances et votre relevé, créez d’abord votre code dans votre espace WARAH ' +
    '(Profil → Messages WhatsApp). « Payer mon loyer » fonctionne sans code.',
  pinUnavailable: 'Le code ne peut pas être vérifié pour le moment. Réessayez un peu plus tard.',
  noReceipt:
    'Vous n’avez pas encore de quittance : elle sera disponible après votre premier paiement confirmé.',
  receiptCaption: (period: string): string => `Votre quittance WARAH — période ${period}.`,
  noStatement: 'Aucune échéance de loyer sur les 6 derniers mois.',
  statement: (lines: string[], remaining: string): string =>
    `Votre relevé des 6 derniers mois :\n\n${lines.join('\n')}\n\nReste à payer : ${remaining}`,
  technicalError: 'Un problème technique m’empêche de répondre. Réessayez dans quelques minutes.',
  // Messagerie avec le gestionnaire (unité 48).
  agentOpened:
    '✅ C’est noté. Écrivez votre message ici, votre gestionnaire vous répondra. ' +
    'Pour revenir au menu, tapez « menu ».',
  agentAlreadyOpen:
    'Votre gestionnaire reçoit déjà vos messages : écrivez-lui ici. Pour revenir au menu, tapez « menu ».',
  mediaNotForwarded:
    'Les photos et notes vocales ne sont pas encore transmises à votre gestionnaire. ' +
    'Merci de décrire votre demande par écrit.',
  relayLimit:
    'Vous avez envoyé beaucoup de messages en peu de temps : les suivants ne seront pas transmis ' +
    'à votre gestionnaire pendant une heure. Il lira ceux déjà reçus.',
  agencyClosed:
    'Votre gestionnaire a terminé l’échange. Tapez « menu » pour revenir au menu.',
};

export function formatFcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

// Dates en heure de Lomé (= UTC toute l'année).
export function formatDay(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatMonth(date: Date): string {
  const label = date.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

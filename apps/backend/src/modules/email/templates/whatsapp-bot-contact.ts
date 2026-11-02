import { escapeHtml } from './layout';
import { TemplateVariables } from './types';

const TOGO_INTERNATIONAL = /^228(\d{8})$/;

// « 22899327312 » → « +228 99 32 73 12 » (lisible par le locataire). Un
// numéro hors Togo (ex. numéro de test Meta) reste « +chiffres ».
export function formatWhatsappNumber(international: string): string {
  const digits = international.replace(/\D/g, '');
  const togo = TOGO_INTERNATIONAL.exec(digits);
  if (!togo) return `+${digits}`;
  const pairs = togo[1].match(/\d{2}/g) ?? [];
  return `+228 ${pairs.join(' ')}`;
}

// Paragraphe « numéro du robot » des emails d'invitation : vide quand le
// numéro n'est pas fourni (WhatsApp éteint), l'email reste alors inchangé.
export function renderWhatsappBotParagraph(variables: TemplateVariables): string {
  const digits = String(variables['whatsappBotNumber'] ?? '').replace(/\D/g, '');
  if (!digits) return '';
  const link = `https://wa.me/${digits}`;
  return `<p>Enregistrez aussi le numéro WhatsApp de WARAH : <strong>${escapeHtml(formatWhatsappNumber(digits))}</strong>. Écrivez-lui pour activer votre assistant WhatsApp (payer votre loyer, recevoir vos quittances) : <a href="${link}">${link}</a></p>`;
}

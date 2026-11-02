import { escapeHtml, renderButton, renderLayout } from './layout';
import { TemplateVariables } from './types';
import { renderWhatsappBotParagraph } from './whatsapp-bot-contact';

export function subject(variables: TemplateVariables): string {
  const inviterName = String(variables['inviterName'] ?? 'Votre propriétaire');
  return `${inviterName} vous invite sur WARAH`;
}

export function render(variables: TemplateVariables): string {
  const inviterName = escapeHtml(String(variables['inviterName'] ?? ''));
  const propertyAddress = escapeHtml(String(variables['propertyAddress'] ?? ''));
  const invitationUrl = String(variables['invitationUrl'] ?? '#');

  const body = `
    <p>Bonjour,</p>
    <p><strong>${inviterName}</strong> vous invite à rejoindre WARAH pour le bien situé à <strong>${propertyAddress}</strong>.</p>
    <p>Sur WARAH, vous pourrez suivre votre loyer, déclarer vos paiements et recevoir vos quittances automatiquement.</p>
    ${renderButton('Créer mon compte', invitationUrl)}
    <p style="font-size:13px;color:#6B7280;">Ce lien d'invitation expire dans 7 jours.</p>
    ${renderWhatsappBotParagraph(variables)}
  `;

  return renderLayout(body, { preheader: `${inviterName} vous invite sur WARAH.` });
}

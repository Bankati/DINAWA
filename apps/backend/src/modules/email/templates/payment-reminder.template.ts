import { escapeHtml, renderAmountBox, renderButton, renderLayout } from './layout';
import { TemplateVariables } from './types';

export function subject(): string {
  return 'Rappel — échéance de loyer à venir';
}

export function render(variables: TemplateVariables): string {
  const period = escapeHtml(String(variables['period'] ?? ''));
  const dueDate = escapeHtml(String(variables['dueDate'] ?? ''));
  const propertyAddress = escapeHtml(String(variables['propertyAddress'] ?? ''));
  // Lien de paiement sans connexion (unité 43), ajouté à l'unité 46.
  const payLinkUrl = String(variables['payLinkUrl'] ?? '');

  const body = `
    <p>Bonjour,</p>
    <p>Votre échéance de loyer pour <strong>${propertyAddress}</strong> approche.</p>
    ${renderAmountBox(`À payer avant le ${dueDate} — période ${period}`, variables['amount'] ?? 0)}
    ${payLinkUrl ? renderButton('Payer mon loyer', escapeHtml(payLinkUrl)) : ''}
    <p>Vous pouvez régler directement par Flooz ou Mixx by Yas, avec ce bouton ou depuis votre espace WARAH.</p>
  `;

  return renderLayout(body, { preheader: `Rappel — échéance de loyer le ${dueDate}.` });
}

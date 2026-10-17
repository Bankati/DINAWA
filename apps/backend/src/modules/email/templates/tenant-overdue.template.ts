import { escapeHtml, renderAmountBox, renderButton, renderLayout } from './layout';
import { TemplateVariables } from './types';

// Relance unique du LOCATAIRE en retard (unité 46) — l'agence reçoit de son
// côté « overdue-alert ». Ton factuel, sans menace : un seul message.
export function subject(): string {
  return 'Votre loyer est en attente de paiement';
}

export function render(variables: TemplateVariables): string {
  const firstName = escapeHtml(String(variables['tenantFirstName'] ?? ''));
  const propertyAddress = escapeHtml(String(variables['propertyAddress'] ?? ''));
  const period = escapeHtml(String(variables['period'] ?? ''));
  const payLinkUrl = String(variables['payLinkUrl'] ?? '');

  const body = `
    <p>Bonjour${firstName ? ` ${firstName}` : ''},</p>
    <p>Sauf erreur de notre part, votre loyer pour la période <strong>${period}</strong> concernant <strong>${propertyAddress}</strong> n'est pas encore réglé.</p>
    ${renderAmountBox('Montant restant à payer', variables['amount'] ?? 0)}
    ${payLinkUrl ? renderButton('Payer mon loyer', escapeHtml(payLinkUrl)) : ''}
    <p>Vous pouvez payer par Flooz ou Mixx by Yas. Si vous avez déjà payé, ne tenez pas compte de ce message.</p>
  `;

  return renderLayout(body, { preheader: 'Votre loyer est en attente de paiement.' });
}

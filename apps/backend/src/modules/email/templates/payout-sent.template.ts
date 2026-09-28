import { escapeHtml, renderAmountBox, renderLayout } from './layout';
import { TemplateVariables } from './types';

export function subject(): string {
  return 'Un loyer vous a été envoyé';
}

export function render(variables: TemplateVariables): string {
  const propertyAddress = escapeHtml(String(variables['propertyAddress'] ?? ''));
  const operator = escapeHtml(String(variables['operator'] ?? ''));
  const phone = escapeHtml(String(variables['phone'] ?? ''));

  const body = `
    <p>Bonjour,</p>
    <p>Un loyer payé pour le bien <strong>${propertyAddress}</strong> vient d'être envoyé sur votre numéro <strong>${operator} — ${phone}</strong>.</p>
    ${renderAmountBox('Montant reçu', variables['amount'] ?? 0)}
    <p>Le détail est disponible dans la rubrique « Paiements » de votre espace WARAH.</p>
  `;

  return renderLayout(body, { preheader: 'Un loyer vous a été envoyé.' });
}

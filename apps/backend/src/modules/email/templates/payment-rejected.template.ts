import { escapeHtml, renderAmountBox, renderLayout } from './layout';
import { TemplateVariables } from './types';

export function subject(): string {
  return 'Votre déclaration de paiement a été rejetée';
}

export function render(variables: TemplateVariables): string {
  const propertyAddress = escapeHtml(String(variables['propertyAddress'] ?? ''));
  const rejectionReason = escapeHtml(String(variables['rejectionReason'] ?? ''));

  const body = `
    <p>Bonjour,</p>
    <p>Votre déclaration de paiement pour le bien <strong>${propertyAddress}</strong> a été rejetée par le propriétaire ou le gestionnaire.</p>
    ${renderAmountBox('Montant déclaré', variables['amount'] ?? 0)}
    <p><strong>Motif :</strong> ${rejectionReason}</p>
    <p>Vous pouvez déclarer à nouveau ce paiement depuis votre espace WARAH.</p>
  `;

  return renderLayout(body, { preheader: 'Votre déclaration de paiement a été rejetée.' });
}

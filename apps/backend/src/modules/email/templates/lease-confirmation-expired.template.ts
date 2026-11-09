import { escapeHtml, renderLayout } from './layout';
import { TemplateVariables } from './types';

// Sans réponse 7 jours après l'envoi (maquettes du 09/11/2026).
export function subject(variables: TemplateVariables): string {
  return `${String(variables['tenantFirstName'] ?? 'Votre locataire')} n'a pas répondu à la demande`;
}

export function render(variables: TemplateVariables): string {
  const tenantFirstName = escapeHtml(String(variables['tenantFirstName'] ?? ''));
  const propertyAddress = escapeHtml(String(variables['propertyAddress'] ?? ''));
  const listingRepublished = variables['listingRepublished'] === 1;

  const body = `
    <p>Bonjour,</p>
    <p><strong>${tenantFirstName}</strong> n'a pas répondu en 7 jours. Vous pouvez renvoyer la demande depuis la page <strong>Mes locataires</strong>.</p>
    ${
      listingRepublished
        ? `<p>L'annonce de <strong>${propertyAddress}</strong> est de nouveau en ligne.</p>`
        : `<p>Le bien <strong>${propertyAddress}</strong> est revenu à son état d'avant la demande.</p>`
    }
  `;

  return renderLayout(body, { preheader: `${tenantFirstName} n'a pas répondu en 7 jours.` });
}

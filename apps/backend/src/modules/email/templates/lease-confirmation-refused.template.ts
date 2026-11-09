import { escapeHtml, renderLayout } from './layout';
import { TemplateVariables } from './types';

// « Ce n'est pas moi » (maquettes du 09/11/2026). Le texte n'accuse
// personne : le numéro ou l'email saisi est sans doute faux.
export function subject(variables: TemplateVariables): string {
  return `${String(variables['tenantFirstName'] ?? 'Votre locataire')} n'a pas confirmé, vérifiez le numéro`;
}

export function render(variables: TemplateVariables): string {
  const tenantFirstName = escapeHtml(String(variables['tenantFirstName'] ?? ''));
  const propertyAddress = escapeHtml(String(variables['propertyAddress'] ?? ''));

  const body = `
    <p>Bonjour,</p>
    <p><strong>${tenantFirstName}</strong> n'a pas confirmé, vérifiez le numéro.</p>
    <p>La personne qui a reçu la demande pour <strong>${propertyAddress}</strong> a répondu « Ce n'est pas moi ». Le bien et son annonce sont revenus à leur état d'avant.</p>
    <p>Depuis la page <strong>Mes locataires</strong>, vous pouvez corriger le numéro ou l'email et renvoyer la demande.</p>
  `;

  return renderLayout(body, { preheader: `${tenantFirstName} n'a pas confirmé, vérifiez le numéro.` });
}

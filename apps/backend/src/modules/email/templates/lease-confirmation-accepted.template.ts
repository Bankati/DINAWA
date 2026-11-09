import { escapeHtml, renderLayout } from './layout';
import { TemplateVariables } from './types';

// Au propriétaire ou au gestionnaire qui a invité (maquettes du 09/11/2026).
// tenantName = le nom qu'il a lui-même tapé, jamais celui du compte.
export function subject(variables: TemplateVariables): string {
  return `${String(variables['tenantName'] ?? 'Votre locataire')} a confirmé le bail`;
}

export function render(variables: TemplateVariables): string {
  const tenantName = escapeHtml(String(variables['tenantName'] ?? ''));
  const propertyAddress = escapeHtml(String(variables['propertyAddress'] ?? ''));

  const body = `
    <p>Bonjour,</p>
    <p><strong>${tenantName}</strong> a confirmé. Le bail de <strong>${propertyAddress}</strong> est actif et l'échéancier est créé.</p>
    <p>Vous retrouvez ce locataire dans la page <strong>Mes locataires</strong> de votre espace WARAH.</p>
  `;

  return renderLayout(body, { preheader: `${tenantName} a confirmé. Le bail est actif.` });
}

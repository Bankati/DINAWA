import { escapeHtml, renderLayout } from './layout';
import { TemplateVariables } from './types';

// Panne marquée terminée par le responsable (unité 53) → locataire.
export function subject(variables: TemplateVariables): string {
  return `Panne ${String(variables['reference'] ?? '')} terminée`;
}

export function render(variables: TemplateVariables): string {
  const reference = escapeHtml(String(variables['reference'] ?? ''));
  const propertyAddress = escapeHtml(String(variables['propertyAddress'] ?? ''));

  const body = `
    <p>Bonjour,</p>
    <p>La panne <strong>${reference}</strong> au bien <strong>${propertyAddress}</strong> est indiquée comme réparée.</p>
    <p>Si le problème continue, signalez une nouvelle panne depuis la page <strong>Mes pannes</strong> de votre espace WARAH.</p>
  `;

  return renderLayout(body, { preheader: 'Votre panne est réparée.' });
}

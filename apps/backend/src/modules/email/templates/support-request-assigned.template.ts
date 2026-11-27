import { escapeHtml, renderLayout } from './layout';
import { TemplateVariables } from './types';

// Artisan choisi pour la panne (unité 53) → locataire.
export function subject(variables: TemplateVariables): string {
  return `Un artisan a été choisi pour votre panne ${String(variables['reference'] ?? '')}`;
}

export function render(variables: TemplateVariables): string {
  const reference = escapeHtml(String(variables['reference'] ?? ''));
  const artisanName = escapeHtml(String(variables['artisanName'] ?? ''));
  const artisanPhone = escapeHtml(String(variables['artisanPhone'] ?? ''));
  const propertyAddress = escapeHtml(String(variables['propertyAddress'] ?? ''));

  const body = `
    <p>Bonjour,</p>
    <p>Pour la panne <strong>${reference}</strong> au bien <strong>${propertyAddress}</strong>,
    l'artisan <strong>${artisanName}</strong> va intervenir.</p>
    <p>Il peut vous appeler pour convenir d'un rendez-vous. Son numéro : <strong>${artisanPhone}</strong>.</p>
    <p>Vous suivez l'avancement dans la page <strong>Mes pannes</strong> de votre espace WARAH.</p>
  `;

  return renderLayout(body, { preheader: `${artisanName} va intervenir pour votre panne.` });
}

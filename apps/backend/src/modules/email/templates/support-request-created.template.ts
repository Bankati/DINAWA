import { escapeHtml, renderLayout } from './layout';
import { TemplateVariables } from './types';

// Panne signalée par un locataire (unité 53) → responsable du bien.
export function subject(variables: TemplateVariables): string {
  const urgent = variables['urgency'] === 'URGENT' ? 'Urgent — ' : '';
  return `${urgent}Panne signalée : ${String(variables['propertyAddress'] ?? '')}`;
}

export function render(variables: TemplateVariables): string {
  const tenantName = escapeHtml(String(variables['tenantName'] ?? ''));
  const propertyAddress = escapeHtml(String(variables['propertyAddress'] ?? ''));
  const reference = escapeHtml(String(variables['reference'] ?? ''));
  const tradeLabel = escapeHtml(String(variables['tradeLabel'] ?? ''));
  const description = escapeHtml(String(variables['description'] ?? ''));
  const urgent = variables['urgency'] === 'URGENT';

  const body = `
    <p>Bonjour,</p>
    <p><strong>${tenantName}</strong> signale une panne au bien <strong>${propertyAddress}</strong>${urgent ? ' (<strong>urgent</strong>)' : ''}.</p>
    <p>Référence : <strong>${reference}</strong><br>Métier concerné : ${tradeLabel}</p>
    <blockquote style="margin:12px 0;padding:8px 12px;border-left:3px solid #C9982E;color:#333">${description}</blockquote>
    <p>Ouvrez la page <strong>Pannes</strong> de votre espace WARAH pour voir les photos et choisir un artisan.</p>
  `;

  return renderLayout(body, { preheader: `Panne signalée par ${tenantName}.` });
}

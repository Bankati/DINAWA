import { escapeHtml, renderLayout } from './layout';
import { TemplateVariables } from './types';

export function subject(): string {
  return 'Nouvelle proposition de mandat WARAH';
}

export function render(variables: TemplateVariables): string {
  const ownerName = escapeHtml(String(variables['ownerName'] ?? 'Un propriétaire'));
  const propertySummary = escapeHtml(String(variables['propertySummary'] ?? ''));
  const feeLabel = escapeHtml(String(variables['feeLabel'] ?? ''));
  const startDate = escapeHtml(String(variables['startDate'] ?? ''));

  const body = `
    <p>Bonjour,</p>
    <p><strong>${ownerName}</strong> vous propose un mandat de gestion pour <strong>${propertySummary}</strong>, à partir du ${startDate}.</p>
    <p>Rémunération proposée : <strong>${feeLabel}</strong>.</p>
    <p>Connectez-vous à WARAH pour accepter ou refuser cette proposition.</p>
  `;

  return renderLayout(body, { preheader: `${ownerName} vous propose un mandat de gestion.` });
}

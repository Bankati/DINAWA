import { escapeHtml, renderAmountBox, renderLayout } from './layout';
import { TemplateVariables } from './types';

export function subject(): string {
  return 'Votre abonnement WARAH est à régler';
}

export function render(variables: TemplateVariables): string {
  const tierLabel = escapeHtml(String(variables['tierLabel'] ?? ''));
  const periodLabel = escapeHtml(String(variables['periodLabel'] ?? ''));

  const body = `
    <p>Bonjour,</p>
    <p>Votre abonnement WARAH <strong>${tierLabel}</strong> pour la période <strong>${periodLabel}</strong> est à régler.</p>
    ${renderAmountBox('Montant dû', variables['amount'] ?? 0)}
    <p>Rendez-vous dans votre profil WARAH, section "Abonnement", pour payer via Mobile Money (T-Money ou Flooz).</p>
  `;

  return renderLayout(body, { preheader: 'Votre abonnement WARAH est à régler.' });
}

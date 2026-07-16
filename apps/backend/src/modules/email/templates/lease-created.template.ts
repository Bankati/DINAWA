import { escapeHtml, renderAmountBox, renderLayout } from './layout';
import { TemplateVariables } from './types';

export function subject(): string {
  return 'Votre nouveau bail WARAH';
}

export function render(variables: TemplateVariables): string {
  const propertyAddress = escapeHtml(String(variables['propertyAddress'] ?? ''));
  const ownerName = escapeHtml(String(variables['ownerName'] ?? 'Votre propriétaire'));
  const startDate = escapeHtml(String(variables['startDate'] ?? ''));
  const monthlyAmount = Number(variables['monthlyAmount'] ?? 0);

  const body = `
    <p>Bonjour,</p>
    <p><strong>${ownerName}</strong> vous a rattaché à un nouveau bail pour le bien situé à <strong>${propertyAddress}</strong>, à partir du ${startDate}.</p>
    ${renderAmountBox('Loyer et charges mensuels', monthlyAmount)}
    <p>Vous pouvez suivre vos échéances, déclarer vos paiements et retrouver vos quittances directement sur WARAH.</p>
  `;

  return renderLayout(body, { preheader: `Nouveau bail pour ${propertyAddress}.` });
}

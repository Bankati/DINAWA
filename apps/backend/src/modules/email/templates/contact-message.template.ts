import { escapeHtml, renderLayout } from './layout';
import { TemplateVariables } from './types';

export function subject(variables: TemplateVariables): string {
  return `[Contact WARAH] ${escapeHtml(String(variables['subject'] ?? 'Nouveau message'))}`;
}

export function render(variables: TemplateVariables): string {
  const name = escapeHtml(String(variables['name'] ?? ''));
  const role = escapeHtml(String(variables['role'] ?? ''));
  const email = escapeHtml(String(variables['email'] ?? ''));
  const phone = escapeHtml(String(variables['phone'] ?? ''));
  const city = escapeHtml(String(variables['city'] ?? ''));
  const subjectText = escapeHtml(String(variables['subject'] ?? ''));
  const message = escapeHtml(String(variables['message'] ?? '')).replace(/\n/g, '<br>');

  const body = `
    <p>Nouveau message reçu via le formulaire de contact public WARAH :</p>
    <p>
      <strong>Nom :</strong> ${name}${role ? ` (${role})` : ''}<br>
      <strong>Email :</strong> ${email}<br>
      ${phone ? `<strong>Téléphone :</strong> ${phone}<br>` : ''}
      ${city ? `<strong>Ville :</strong> ${city}<br>` : ''}
      <strong>Sujet :</strong> ${subjectText}
    </p>
    <p>${message}</p>
  `;

  return renderLayout(body, { preheader: `Nouveau message de contact : ${subjectText}` });
}

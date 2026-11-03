import { escapeHtml, renderLayout } from './layout';
import { TemplateVariables } from './types';

// Code locataire créé depuis WhatsApp (unité 50) : l'agence est prévenue au
// cas où ce ne serait pas le locataire (téléphone perdu ou prêté). JAMAIS le
// code dans le message.
export function subject(): string {
  return 'Un locataire a créé son code WhatsApp';
}

export function render(variables: TemplateVariables): string {
  const tenantName = escapeHtml(String(variables['tenantName'] ?? ''));
  const propertyAddress = escapeHtml(String(variables['propertyAddress'] ?? ''));

  const body = `
    <p>Bonjour,</p>
    <p><strong>${tenantName}</strong> (bien <strong>${propertyAddress}</strong>) a créé son code secret
    depuis WhatsApp. Il peut maintenant y recevoir ses quittances et son relevé.</p>
    <p>Si ce n'est pas lui (téléphone perdu ou prêté), réinitialisez son code depuis la page
    <strong>Locataires</strong> de votre espace WARAH.</p>
  `;

  return renderLayout(body, {
    preheader: 'Un locataire a créé son code secret WhatsApp.',
  });
}

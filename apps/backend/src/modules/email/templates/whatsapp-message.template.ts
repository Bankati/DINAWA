import { escapeHtml, renderLayout } from './layout';
import { TemplateVariables } from './types';

// Messagerie WhatsApp (unité 48, décision 2) : qui écrit et pour quel bien,
// JAMAIS le contenu du message (il reste dans WARAH, derrière la connexion).
export function subject(): string {
  return 'Un locataire vous a écrit sur WhatsApp';
}

export function render(variables: TemplateVariables): string {
  const tenantName = escapeHtml(String(variables['tenantName'] ?? ''));
  const propertyAddress = escapeHtml(String(variables['propertyAddress'] ?? ''));

  const body = `
    <p>Bonjour,</p>
    <p><strong>${tenantName}</strong> vous a écrit sur WhatsApp au sujet du bien <strong>${propertyAddress}</strong>.</p>
    <p>Lisez son message et répondez-lui depuis la page <strong>Messages</strong> de votre espace WARAH.
    Vous pouvez lui répondre pendant 24 heures après son dernier message.</p>
  `;

  return renderLayout(body, {
    preheader: 'Un locataire attend votre réponse sur WhatsApp.',
  });
}

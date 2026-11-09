import { escapeHtml, renderAmountBox, renderButton, renderLayout } from './layout';
import { TemplateVariables } from './types';

// Demande d'accord au locataire déjà inscrit (contrat d'API du 09/11/2026,
// maquette F de Majoie). Les deux boutons ouvrent la page /locataire de
// WARAH : un lien d'email ne valide JAMAIS une réponse tout seul, car
// certains services d'email ouvrent les liens pour les analyser.
export function subject(variables: TemplateVariables): string {
  const inviterName = String(variables['inviterName'] ?? 'Votre propriétaire');
  return variables['isReminder'] === 1
    ? `Rappel : ${inviterName} vous ajoute comme locataire`
    : `${inviterName} vous ajoute comme locataire`;
}

export function render(variables: TemplateVariables): string {
  const firstName = escapeHtml(String(variables['tenantFirstName'] ?? ''));
  const inviterName = escapeHtml(String(variables['inviterName'] ?? 'Votre propriétaire'));
  const propertyAddress = escapeHtml(String(variables['propertyAddress'] ?? ''));
  const startDate = escapeHtml(String(variables['startDate'] ?? ''));
  const expiresAt = escapeHtml(String(variables['expiresAt'] ?? ''));
  const monthlyRent = Number(variables['monthlyRent'] ?? 0);
  const actionUrl = String(variables['actionUrl'] ?? '');

  const body = `
    <p>Bonjour${firstName ? ` ${firstName}` : ''},</p>
    <p><strong>${inviterName}</strong> vous ajoute comme locataire sur WARAH :</p>
    <p>${propertyAddress}<br />À partir du ${startDate}</p>
    ${renderAmountBox('Loyer par mois', monthlyRent)}
    <p><strong>Est-ce bien votre logement ?</strong></p>
    ${renderButton("Oui, c'est mon logement", actionUrl)}
    ${renderButton("Ce n'est pas moi", actionUrl)}
    <p>Les boutons ouvrent votre espace WARAH : vous y répondez d'un seul appui. Rien n'est ajouté à votre compte tant que vous n'avez pas répondu « Oui ».</p>
    <p style="font-size:13px;color:#6B7280;">Sans réponse, la demande expire le ${expiresAt}. Vous pouvez aussi répondre sur WhatsApp ou dans votre espace WARAH.</p>
  `;

  return renderLayout(body, { preheader: `${inviterName} vous ajoute comme locataire. Est-ce bien votre logement ?` });
}

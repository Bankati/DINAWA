import { escapeHtml, renderAmountBox, renderButton, renderLayout } from './layout';
import { TemplateVariables } from './types';

export function subject(): string {
  return 'Votre nouveau bail WARAH';
}

export function render(variables: TemplateVariables): string {
  const propertyAddress = escapeHtml(String(variables['propertyAddress'] ?? ''));
  const ownerName = escapeHtml(String(variables['ownerName'] ?? 'Votre propriétaire'));
  const startDate = escapeHtml(String(variables['startDate'] ?? ''));
  const monthlyAmount = Number(variables['monthlyAmount'] ?? 0);
  const invitationUrl = variables['invitationUrl'] ? String(variables['invitationUrl']) : null;

  const body = `
    <p>Bonjour,</p>
    <p><strong>${ownerName}</strong> vous a rattaché à un nouveau bail pour le bien situé à <strong>${propertyAddress}</strong>, à partir du ${startDate}.</p>
    ${renderAmountBox('Loyer et charges mensuels', monthlyAmount)}
    ${
      invitationUrl
        ? `<p>Pour accéder à votre espace locataire (suivi du loyer, déclarations de paiement, quittances), créez votre mot de passe en cliquant ci-dessous :</p>
         ${renderButton('Créer mon compte', invitationUrl)}
         <p style="font-size:13px;color:#6B7280;">Ce lien expire dans 7 jours.</p>`
        : `<p>Vous pouvez suivre vos échéances, déclarer vos paiements et retrouver vos quittances directement sur WARAH.</p>`
    }
  `;

  return renderLayout(body, { preheader: `Nouveau bail pour ${propertyAddress}.` });
}

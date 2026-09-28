import { escapeHtml, renderAmountBox, renderLayout } from './layout';
import { TemplateVariables } from './types';

export function subject(variables: TemplateVariables): string {
  // Objet d'email en texte brut — pas d'échappement HTML ici.
  return `[WARAH] Reversement en échec — ${String(variables['reason'] ?? '')}`;
}

export function render(variables: TemplateVariables): string {
  const payoutId = escapeHtml(String(variables['payoutId'] ?? ''));
  const beneficiaryName = escapeHtml(String(variables['beneficiaryName'] ?? ''));
  const reason = escapeHtml(String(variables['reason'] ?? ''));
  const attempts = escapeHtml(String(variables['attempts'] ?? ''));

  const body = `
    <p>Un reversement de loyer nécessite une intervention.</p>
    ${renderAmountBox('Montant à reverser', variables['amount'] ?? 0)}
    <p><strong>Bénéficiaire :</strong> ${beneficiaryName}<br />
    <strong>Reversement :</strong> ${payoutId}<br />
    <strong>Tentatives :</strong> ${attempts}<br />
    <strong>Cause :</strong> ${reason}</p>
    <p>Si la cause est un solde PayDunya insuffisant, rechargez-le : l'envoi repart automatiquement. Sinon, corrigez le problème puis relancez le reversement depuis l'administration (Reversements).</p>
  `;

  return renderLayout(body, { preheader: 'Un reversement de loyer est en échec.' });
}

import { escapeHtml, renderAmountBox, renderLayout } from './layout';
import { TemplateVariables } from './types';

// Mis à jour pour l'unité 33 (2026-08-08, /architect) — variables alignées
// sur ManagerReportsService : rapport consolidé par propriétaire mandant
// (jamais par mandat individuel), sans note libre ni taux d'occupation
// (retirés du périmètre en /architect).
export function subject(variables: TemplateVariables): string {
  const periodLabel = escapeHtml(String(variables['periodLabel'] ?? ''));
  return `Votre rapport mensuel WARAH — ${periodLabel}`;
}

export function render(variables: TemplateVariables): string {
  const managerName = escapeHtml(String(variables['managerName'] ?? 'Votre gestionnaire'));
  const periodLabel = escapeHtml(String(variables['periodLabel'] ?? ''));
  const propertyCount = Number(variables['propertyCount'] ?? 0);
  const totalReceived = Number(variables['totalReceived'] ?? 0);
  const overdueCount = Number(variables['overdueCount'] ?? 0);

  const overdueLine =
    overdueCount > 0
      ? `<p style="color:#B91C1C;"><strong>${overdueCount}</strong> échéance(s) impayée(s) en cours — le détail est dans le rapport joint.</p>`
      : `<p>Aucun impayé en cours ce mois-ci.</p>`;

  const body = `
    <p>Bonjour,</p>
    <p>Voici le rapport mensuel de gestion de <strong>${managerName}</strong> pour <strong>${periodLabel}</strong>, couvrant vos ${propertyCount} bien(s) confié(s).</p>
    ${renderAmountBox('Total reçu ce mois', totalReceived)}
    ${overdueLine}
    <p>Le détail complet (paiements par bien, impayés, déclarations traitées) est disponible dans le PDF joint à cet email.</p>
  `;

  return renderLayout(body, { preheader: `Rapport mensuel — ${periodLabel}` });
}

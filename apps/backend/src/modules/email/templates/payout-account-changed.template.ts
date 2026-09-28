import { escapeHtml, renderLayout } from './layout';
import { TemplateVariables } from './types';

export function subject(): string {
  return 'Votre numéro de réception WARAH a été modifié';
}

export function render(variables: TemplateVariables): string {
  const operator = escapeHtml(String(variables['operator'] ?? ''));
  const phone = escapeHtml(String(variables['phone'] ?? ''));

  const body = `
    <p>Bonjour,</p>
    <p>Le numéro sur lequel vous recevez vos loyers vient d'être enregistré ou modifié : <strong>${operator} — ${phone}</strong>.</p>
    <p>Si vous êtes à l'origine de ce changement, vous n'avez rien à faire.</p>
    <p><strong>Si ce n'est pas vous</strong>, changez immédiatement votre mot de passe depuis votre profil et contactez-nous en répondant à cet email : vos prochains loyers seraient envoyés à ce numéro.</p>
  `;

  return renderLayout(body, { preheader: 'Votre numéro de réception des loyers a changé.' });
}

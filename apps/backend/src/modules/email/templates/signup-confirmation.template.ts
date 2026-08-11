import { escapeHtml, renderButton, renderLayout } from './layout';
import { TemplateVariables } from './types';

export function subject(): string {
  return 'Bienvenue sur WARAH';
}

// Simple email de bienvenue — le compte est déjà pleinement actif dès
// l'inscription (aucune étape de confirmation n'existe réellement, voir
// AuthService.createConfirmedAccount()). Corrigé le 2026-08-11 : l'ancien
// texte prétendait à tort qu'un clic était nécessaire pour "activer" le
// compte, ce qui était faux et trompeur.
export function render(variables: TemplateVariables): string {
  const firstName = escapeHtml(String(variables['firstName'] ?? ''));
  const confirmationUrl = String(variables['confirmationUrl'] ?? '#');

  const body = `
    <p>Bonjour ${firstName},</p>
    <p>Bienvenue sur WARAH ! Votre compte est prêt, vous pouvez dès maintenant vous connecter et commencer à gérer vos biens en toute sérénité.</p>
    ${renderButton('Me connecter', confirmationUrl)}
  `;

  return renderLayout(body, {
    preheader: 'Votre compte WARAH est prêt.',
  });
}

import { escapeHtml, renderLayout } from './layout';
import { TemplateVariables } from './types';

export function subject(): string {
  return 'Un locataire ne peut pas payer : ajoutez votre numéro de réception';
}

export function render(variables: TemplateVariables): string {
  const propertyAddress = escapeHtml(String(variables['propertyAddress'] ?? ''));

  const body = `
    <p>Bonjour,</p>
    <p>Un locataire a essayé de payer son loyer en ligne pour le bien <strong>${propertyAddress}</strong>, mais le paiement a été refusé : vous n'avez pas encore renseigné le numéro mobile money sur lequel recevoir vos loyers.</p>
    <p>Ajoutez votre numéro de réception (T-Money ou Flooz) dans votre profil WARAH, rubrique « Numéro de réception ». Le locataire pourra alors payer immédiatement.</p>
  `;

  return renderLayout(body, {
    preheader: 'Ajoutez votre numéro de réception pour recevoir vos loyers.',
  });
}

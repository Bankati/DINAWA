import { escapeHtml, renderLayout } from './layout';
import { TemplateVariables } from './types';

export function subject(): string {
  return 'Un locataire ne peut pas payer : complétez votre profil de paiement';
}

export function render(variables: TemplateVariables): string {
  const propertyAddress = escapeHtml(String(variables['propertyAddress'] ?? ''));

  const body = `
    <p>Bonjour,</p>
    <p>Un locataire a essayé de payer son loyer en ligne pour le bien <strong>${propertyAddress}</strong>, mais le paiement a été refusé : votre profil ne précise pas encore l'opérateur mobile money (T-Money ou Flooz) de votre numéro.</p>
    <p>Complétez-le dans votre profil WARAH, rubrique « Numéro de téléphone ». Le locataire pourra alors payer immédiatement.</p>
  `;

  return renderLayout(body, {
    preheader: 'Complétez votre profil pour recevoir vos loyers.',
  });
}

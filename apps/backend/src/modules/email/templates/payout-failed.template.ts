import { escapeHtml, renderAmountBox, renderLayout } from './layout';
import { TemplateVariables } from './types';

export function subject(): string {
  return "Nous n'avons pas pu vous envoyer un loyer";
}

export function render(variables: TemplateVariables): string {
  const propertyAddress = escapeHtml(String(variables['propertyAddress'] ?? ''));
  const operator = escapeHtml(String(variables['operator'] ?? ''));
  const phone = escapeHtml(String(variables['phone'] ?? ''));

  const body = `
    <p>Bonjour,</p>
    <p>Un locataire a payé le loyer du bien <strong>${propertyAddress}</strong>, mais l'envoi vers votre numéro <strong>${operator} — ${phone}</strong> n'a pas abouti après plusieurs tentatives.</p>
    ${renderAmountBox('Montant à recevoir', variables['amount'] ?? 0)}
    <p>Vérifiez que votre numéro et votre opérateur mobile money sont corrects (rubrique « Numéro de téléphone » de votre profil) et que votre compte mobile money est actif. L'équipe WARAH a été prévenue et relancera l'envoi : votre argent est en sécurité.</p>
  `;

  return renderLayout(body, { preheader: "Nous n'avons pas pu vous envoyer un loyer." });
}

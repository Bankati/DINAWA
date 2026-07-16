import { renderLayout } from './layout';
import { TemplateVariables } from './types';

export function subject(): string {
  return 'Votre compte WARAH est de nouveau actif';
}

export function render(_variables: TemplateVariables): string {
  const body = `
    <p>Bonjour,</p>
    <p>Bonne nouvelle : votre compte WARAH est de nouveau pleinement actif.</p>
    <p>Toutes les fonctionnalités sont à nouveau disponibles.</p>
  `;

  return renderLayout(body, { preheader: 'Votre compte WARAH est de nouveau actif.' });
}

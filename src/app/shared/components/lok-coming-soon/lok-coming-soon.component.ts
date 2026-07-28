import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Fonctionnalité prévue au plan produit mais pas encore construite côté
// backend — affiche un état honnête plutôt qu'un formulaire qui échoue
// silencieusement à la soumission (même esprit que mobile-money-payment/
// rappels-alertes, généralisé ici pour les autres pages dans le même cas).
@Component({
  selector: 'lok-coming-soon',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-10 max-w-md text-center">
        <div class="icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <h1 class="text-xl font-bold text-gray-900 mt-4">{{ titre }}</h1>
        <p class="text-sm text-gray-600 mt-2">{{ description }}</p>
        @if (backRoute) {
          <a [routerLink]="backRoute" class="btn-secondary inline-block mt-6">{{ backLabel }}</a>
        }
      </div>
    </div>
  `,
  styles: [`
    .icon-wrap { width: 56px; height: 56px; border-radius: 14px; background: var(--color-primary-50); color: var(--color-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto; }
    .icon-wrap svg { width: 26px; height: 26px; }
  `],
})
export class LokComingSoonComponent {
  @Input({ required: true }) titre!: string;
  @Input({ required: true }) description!: string;
  @Input() backRoute?: string;
  @Input() backLabel = 'Retour';
}

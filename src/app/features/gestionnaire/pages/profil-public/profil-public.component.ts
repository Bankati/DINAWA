import { Component } from '@angular/core';
import { LokComingSoonComponent } from '../../../../shared/components/lok-coming-soon/lok-coming-soon.component';

// Profil public gestionnaire (avec avis clients) prévu au plan produit
// (Phase 8) mais pas encore construit côté backend — voir audit /architect
// redesign propriétaire/gestionnaire, vague 2, 2026-07-28.
@Component({
  selector: 'app-profil-public',
  standalone: true,
  imports: [LokComingSoonComponent],
  template: `
    <lok-coming-soon
      titre="Profil public"
      description="Votre profil public (visible des propriétaires à la recherche d'un gestionnaire, avec avis clients) est en cours de développement."
      backRoute="/gestionnaire/dashboard"
    ></lok-coming-soon>
  `,
})
export class ProfilPublicComponent {}

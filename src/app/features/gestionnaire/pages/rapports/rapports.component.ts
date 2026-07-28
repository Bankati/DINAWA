import { Component } from '@angular/core';
import { LokComingSoonComponent } from '../../../../shared/components/lok-coming-soon/lok-coming-soon.component';

// Rapports mensuels automatiques prévus au plan produit (Phase 8) mais pas
// encore construits côté backend — voir audit /architect redesign
// propriétaire/gestionnaire, vague 2, 2026-07-28.
@Component({
  selector: 'app-rapports',
  standalone: true,
  imports: [LokComingSoonComponent],
  template: `
    <lok-coming-soon
      titre="Rapports"
      description="La génération de rapports mensuels (PDF, envoi automatique par email) est en cours de développement."
      backRoute="/gestionnaire/dashboard"
    ></lok-coming-soon>
  `,
})
export class RapportsComponent {}

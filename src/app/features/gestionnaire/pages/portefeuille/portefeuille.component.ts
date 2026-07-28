import { Component } from '@angular/core';
import { LokComingSoonComponent } from '../../../../shared/components/lok-coming-soon/lok-coming-soon.component';

// Le portefeuille repose sur les mandats propriétaire → gestionnaire, une
// fonctionnalité prévue au plan produit (Phase 8) mais pas encore construite
// côté backend — voir audit /architect redesign propriétaire/gestionnaire,
// vague 2, 2026-07-28.
@Component({
  selector: 'app-portefeuille',
  standalone: true,
  imports: [LokComingSoonComponent],
  template: `
    <lok-coming-soon
      titre="Portefeuille"
      description="La délégation de biens par un propriétaire (mandats) est prévue mais pas encore disponible. Une fois construite, vous verrez ici tous les biens qui vous sont confiés."
      backRoute="/gestionnaire/dashboard"
    ></lok-coming-soon>
  `,
})
export class PortefeuilleComponent {}

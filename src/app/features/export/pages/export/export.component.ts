import { Component, inject } from '@angular/core';
import { LokComingSoonComponent } from '../../../../shared/components/lok-coming-soon/lok-coming-soon.component';
import { AuthService } from '../../../../core/services/auth.service';

// GestionnaireService.getExports/exporterDonnees/telechargerExport visaient
// un endpoint /gestionnaire/exports inexistant (aucun module "gestionnaire"
// côté backend) — voir audit /architect redesign propriétaire/gestionnaire,
// vague 2, 2026-07-28.
@Component({
  selector: 'app-export',
  standalone: true,
  imports: [LokComingSoonComponent],
  template: `
    <lok-coming-soon
      titre="Export de données"
      description="L'export PDF/Excel de vos biens, locataires et paiements est en cours de développement."
      [backRoute]="basePath"
    ></lok-coming-soon>
  `,
})
export class ExportComponent {
  private readonly auth = inject(AuthService);
  basePath = this.auth.getWorkspacePrefix();
}

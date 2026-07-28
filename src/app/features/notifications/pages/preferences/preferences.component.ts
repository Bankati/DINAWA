import { Component, inject } from '@angular/core';
import { LokComingSoonComponent } from '../../../../shared/components/lok-coming-soon/lok-coming-soon.component';
import { AuthService } from '../../../../core/services/auth.service';

// Aucun endpoint /notifications/preferences n'existe côté backend (voir
// audit /architect redesign propriétaire/gestionnaire, vague 2, 2026-07-28).
@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [LokComingSoonComponent],
  template: `
    <lok-coming-soon
      titre="Préférences de notifications"
      description="Le réglage fin des canaux et types de notifications est en cours de développement."
      [backRoute]="basePath + '/notifications'"
    ></lok-coming-soon>
  `,
})
export class PreferencesComponent {
  private readonly auth = inject(AuthService);
  basePath = this.auth.getWorkspacePrefix();
}

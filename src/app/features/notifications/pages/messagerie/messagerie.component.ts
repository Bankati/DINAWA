import { Component, inject } from '@angular/core';
import { LokComingSoonComponent } from '../../../../shared/components/lok-coming-soon/lok-coming-soon.component';
import { AuthService } from '../../../../core/services/auth.service';

// Aucun module de messagerie interne n'existe côté backend (voir audit
// /architect redesign propriétaire/gestionnaire, vague 2, 2026-07-28) —
// NotificationsBackendService.getConversations/getMessages/envoyerMessage
// visaient tous un endpoint /notifications/messagerie inexistant.
@Component({
  selector: 'app-messagerie',
  standalone: true,
  imports: [LokComingSoonComponent],
  template: `
    <lok-coming-soon
      titre="Messagerie"
      description="La messagerie interne avec vos locataires est en cours de développement."
      [backRoute]="basePath"
    ></lok-coming-soon>
  `,
})
export class MessagerieComponent {
  private readonly auth = inject(AuthService);
  basePath = this.auth.getWorkspacePrefix();
}

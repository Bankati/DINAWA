import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

// L'envoi automatique de rappels/alertes (cron) n'est pas encore construit
// côté backend (voir apps/backend/contexte/build-plan.md, unités 24/25) — seuls
// les réglages par bail (reminderDaysBefore/overdueAlertWindowDays) existent en
// stockage. En attendant, le filtre "En retard"/"Impayés" de la liste des
// paiements reste la source fiable pour suivre les échéances en souffrance.
@Component({
  selector: 'app-rappels-alertes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Rappels et alertes</h1>
            <p class="text-sm text-gray-600">Notifications automatiques de paiement</p>
          </div>
          <button [routerLink]="basePath + '/paiements'" class="btn-secondary">Retour</button>
        </div>
      </div>

      <div class="p-6 max-w-2xl mx-auto">
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <div class="icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <h2 class="text-lg font-bold text-gray-900 mt-4">Bientôt disponible</h2>
          <p class="text-sm text-gray-600 mt-2">
            L'envoi automatique de rappels avant échéance et d'alertes d'impayés est en cours de développement.
            En attendant, retrouvez les paiements en retard ou impayés directement dans la liste des paiements.
          </p>
          <a [routerLink]="basePath + '/paiements'" class="btn-primary inline-block mt-6">Voir les paiements en retard</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .icon-wrap { width: 56px; height: 56px; border-radius: 14px; background: rgba(201,152,46,0.12); color: var(--color-accent); display: flex; align-items: center; justify-content: center; margin: 0 auto; }
    .icon-wrap svg { width: 26px; height: 26px; }
  `],
})
export class RappelsAlertesComponent {
  private readonly auth = inject(AuthService);
  basePath = this.auth.getWorkspacePrefix();
}

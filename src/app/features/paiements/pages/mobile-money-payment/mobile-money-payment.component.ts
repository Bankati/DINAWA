import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

// Le paiement direct T-Money / Flooz passe par l'intégration Cashpay, non
// construite côté backend (voir apps/backend/contexte/build-plan.md, unité 17).
// La saisie manuelle (espèces / virement) et la déclaration locataire sont les
// seules voies disponibles pour l'instant — voir paiement-form.component.ts.
@Component({
  selector: 'app-mobile-money-payment',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-10 max-w-md text-center">
        <div class="icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="5" y1="18" x2="19" y2="18"/>
          </svg>
        </div>
        <h1 class="text-xl font-bold text-gray-900 mt-4">Paiement Mobile Money</h1>
        <p class="text-sm text-gray-600 mt-2">
          Le paiement direct via T-Money et Flooz arrive avec l'intégration Cashpay, en cours de développement.
          En attendant, les paiements espèces et virement peuvent être enregistrés manuellement par le propriétaire
          ou le gestionnaire.
        </p>
        <a [routerLink]="basePath + '/paiements/nouveau'" class="btn-primary inline-block mt-6">Enregistrer un paiement manuel</a>
      </div>
    </div>
  `,
  styles: [`
    .icon-wrap { width: 56px; height: 56px; border-radius: 14px; background: var(--color-primary-50); color: var(--color-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto; }
    .icon-wrap svg { width: 26px; height: 26px; }
  `],
})
export class MobileMoneyPaymentComponent {
  private readonly auth = inject(AuthService);
  basePath = this.auth.getWorkspacePrefix();
}

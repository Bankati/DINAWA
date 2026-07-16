import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';

@Component({
  selector: 'app-locataire-form',
  standalone: true,
  imports: [CommonModule, RouterModule, LokAlerteComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Ajouter un locataire</h1>
            <p class="text-sm text-gray-600">Fonctionnalité en cours de développement</p>
          </div>
          <button routerLink="/dashboard/locataires" class="btn-secondary">Retour</button>
        </div>
      </div>
      <div class="p-6 max-w-2xl mx-auto">
        <lok-alerte
          type="info"
          message="La création de locataires se fait via le formulaire d'invitation (à venir). Retournez à la liste des locataires."
        ></lok-alerte>
      </div>
    </div>
  `,
})
export class LocataireFormComponent {}

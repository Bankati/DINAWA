import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LocatairesService } from '../../services/locataires.service';
import { Locataire } from '@core/models/locataire.model';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';

@Component({
  selector: 'app-locataire-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LokSkeletonComponent, LokAlerteComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-gray-900">Détail locataire</h1>
          <button routerLink="/dashboard/locataires" class="btn-secondary">Retour</button>
        </div>
      </div>
      <div class="p-6 max-w-2xl mx-auto">
        @if (loading) {
          <lok-skeleton type="card"></lok-skeleton>
        } @else if (errorMessage) {
          <lok-alerte type="error" [message]="errorMessage"></lok-alerte>
        } @else if (locataire) {
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl">
                {{ locataire.firstName.charAt(0) }}{{ locataire.lastName.charAt(0) }}
              </div>
              <div>
                <h2 class="text-xl font-semibold text-gray-900">{{ locataire.firstName }} {{ locataire.lastName }}</h2>
                <p class="text-sm text-gray-500">{{ locataire.accountStatus }}</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <p class="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                <p class="text-sm font-medium text-gray-900">{{ locataire.email ?? '—' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 uppercase tracking-wide">Téléphone</p>
                <p class="text-sm font-medium text-gray-900">{{ locataire.phone ?? '—' }}</p>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class LocataireDetailComponent implements OnInit {
  locataire: Locataire | null = null;
  loading = true;
  errorMessage = '';

  constructor(
    private locatairesService: LocatairesService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (id) {
      this.locatairesService.getLocataireById(id).subscribe({
        next: (data) => {
          this.locataire = data;
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Impossible de charger les informations du locataire.';
          this.loading = false;
        },
      });
    }
  }
}

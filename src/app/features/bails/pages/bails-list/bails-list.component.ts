import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BailsService } from '../../services/bails.service';
import { BailAvecLocataire, LEASE_STATUS_LABELS, LeaseStatus, PAYMENT_FREQUENCY_LABELS } from '@core/models/locataire.model';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';

@Component({
  selector: 'app-bails-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LokSkeletonComponent, LokEmptyStateComponent, LokAlerteComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Baux</h1>
            <p class="text-sm text-gray-600">Contrats de bail actifs et historique</p>
          </div>
          <a routerLink="nouveau" class="btn-primary">+ Nouveau bail</a>
        </div>

        <!-- Filtres -->
        <div class="flex gap-2 mt-4">
          @for (f of filtres; track f.val) {
            <button
              class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              [class]="filtreActif() === f.val ? 'bg-blue-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              (click)="filtreActif.set(f.val)">
              {{ f.label }}
            </button>
          }
        </div>
      </div>

      <div class="p-6">
        @if (loading()) {
          <div class="grid gap-4">
            @for (i of [1,2,3]; track i) { <lok-skeleton type="card"></lok-skeleton> }
          </div>
        } @else if (errorMsg()) {
          <lok-alerte type="error" [message]="errorMsg()"></lok-alerte>
        } @else if (bailsFiltres().length === 0) {
          <lok-empty-state
            titre="Aucun bail trouvé"
            description="Les baux apparaîtront ici une fois créés.">
          </lok-empty-state>
        } @else {
          <div class="grid gap-4">
            @for (b of bailsFiltres(); track b.id) {
              <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="font-semibold text-gray-900">{{ b.tenant.firstName }} {{ b.tenant.lastName }}</span>
                      <span [class]="statusClass(b.status)" class="px-2 py-0.5 rounded-full text-xs font-semibold">
                        {{ statusLabel(b.status) }}
                      </span>
                    </div>
                    <p class="text-sm text-gray-500">{{ b.property.neighborhood }}, {{ b.property.city }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{{ b.tenant.phone ?? b.tenant.email ?? '—' }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-lg font-bold text-gray-900">{{ b.monthlyRent | number }} <span class="text-sm font-normal text-gray-500">FCFA</span></p>
                    <p class="text-xs text-gray-400">{{ freqLabel(b.paymentFrequency) }}</p>
                  </div>
                </div>

                <div class="border-t border-gray-100 mt-4 pt-3 flex items-center justify-between flex-wrap gap-2">
                  <div class="flex gap-4 text-xs text-gray-500">
                    <span>Début : <strong class="text-gray-700">{{ b.startDate | date:'dd/MM/yyyy' }}</strong></span>
                    @if (b.endDate) {
                      <span>Fin : <strong class="text-gray-700">{{ b.endDate | date:'dd/MM/yyyy' }}</strong></span>
                    }
                    @if (b.status === 'TERMINATED' && b.terminatedAt) {
                      <span>Résilié le : <strong class="text-red-600">{{ b.terminatedAt | date:'dd/MM/yyyy' }}</strong></span>
                    }
                  </div>
                  @if (b.status === 'ACTIVE') {
                    <button
                      class="text-xs text-red-600 border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                      (click)="openResilier(b)">
                      Résilier
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- Modal résiliation -->
    @if (bailAResilier()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
          <h2 class="text-lg font-bold text-gray-900 mb-1">Résilier le bail</h2>
          <p class="text-sm text-gray-500 mb-4">
            Locataire : <strong>{{ bailAResilier()!.tenant.firstName }} {{ bailAResilier()!.tenant.lastName }}</strong>
          </p>
          @if (resilierError()) {
            <lok-alerte type="error" [message]="resilierError()"></lok-alerte>
          }
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Motif de résiliation *</label>
            <textarea
              [(ngModel)]="resilierRaison"
              rows="3"
              class="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800"
              placeholder="Ex: fin de location à l'amiable, non paiement…">
            </textarea>
          </div>
          <div class="flex gap-3 justify-end">
            <button class="btn-secondary" (click)="bailAResilier.set(null); resilierRaison = ''">Annuler</button>
            <button class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              [disabled]="!resilierRaison.trim() || resilierLoading()"
              (click)="confirmerResilier()">
              @if (resilierLoading()) { Résiliation… } @else { Confirmer la résiliation }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .btn-primary { background: #0F4C81; color: white; border: none; border-radius: .625rem;
      padding: .625rem 1.25rem; font-size: .9rem; font-weight: 600; cursor: pointer;
      text-decoration: none; display: inline-block; transition: background .2s; }
    .btn-primary:hover { background: #0A2650; }
    .btn-secondary { border: 1.5px solid #d1d5db; border-radius: .5rem;
      padding: .5rem .875rem; font-weight: 500; color: #374151; background: white;
      cursor: pointer; transition: border-color .2s; }
    .btn-secondary:hover { border-color: #0F4C81; color: #0F4C81; }
  `],
})
export class BailsListComponent implements OnInit {
  loading = signal(true);
  errorMsg = signal('');
  bails = signal<BailAvecLocataire[]>([]);
  filtreActif = signal<LeaseStatus | 'ALL'>('ALL');
  bailAResilier = signal<BailAvecLocataire | null>(null);
  resilierLoading = signal(false);
  resilierError = signal('');
  resilierRaison = '';

  filtres: { val: LeaseStatus | 'ALL'; label: string }[] = [
    { val: 'ALL',        label: 'Tous' },
    { val: 'ACTIVE',     label: 'Actifs' },
    { val: 'EXPIRED',    label: 'Expirés' },
    { val: 'TERMINATED', label: 'Résiliés' },
  ];

  constructor(private bailsService: BailsService) {}

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.bailsService.getAllLeases().subscribe({
      next: (res) => {
        this.bails.set(res.data as unknown as BailAvecLocataire[]);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.errorMsg.set(err.error?.message || 'Impossible de charger les baux.');
        this.loading.set(false);
      },
    });
  }

  bailsFiltres() {
    const f = this.filtreActif();
    return f === 'ALL' ? this.bails() : this.bails().filter(b => b.status === f);
  }

  statusLabel(s: LeaseStatus): string { return LEASE_STATUS_LABELS[s] ?? s; }

  freqLabel(f: string): string { return PAYMENT_FREQUENCY_LABELS[f as keyof typeof PAYMENT_FREQUENCY_LABELS] ?? f; }

  statusClass(s: LeaseStatus): string {
    switch (s) {
      case 'ACTIVE':     return 'bg-green-100 text-green-800';
      case 'EXPIRED':    return 'bg-yellow-100 text-yellow-800';
      case 'TERMINATED': return 'bg-red-100 text-red-700';
    }
  }

  openResilier(b: BailAvecLocataire): void {
    this.resilierRaison = '';
    this.resilierError.set('');
    this.bailAResilier.set(b);
  }

  confirmerResilier(): void {
    const b = this.bailAResilier();
    if (!b || !this.resilierRaison.trim()) return;
    this.resilierLoading.set(true);
    this.resilierError.set('');
    this.bailsService.terminateBail(b.id, { reason: this.resilierRaison }).subscribe({
      next: () => {
        this.resilierLoading.set(false);
        this.bailAResilier.set(null);
        this.charger();
      },
      error: (err: any) => {
        this.resilierLoading.set(false);
        this.resilierError.set(err.error?.message || 'Erreur lors de la résiliation.');
      },
    });
  }
}

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BailsService } from '../../services/bails.service';
import { BailAvecLocataire, LEASE_STATUS_LABELS, LeaseStatus, PAYMENT_FREQUENCY_LABELS } from '@core/models/locataire.model';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokDatePipe } from '../../../../shared/pipes/lok-date.pipe';

@Component({
  selector: 'app-bails-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LokSkeletonComponent, LokEmptyStateComponent, LokAlerteComponent, LokDatePipe],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- ── HEADER ── -->
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-logo">
            <img src="/assets/WARAH-logo.png" alt="WARAH" class="logo-img">
          </div>
          <div class="page-divider"></div>
          <div>
            <h1 class="page-title">Baux</h1>
            <p class="page-sub">Contrats de bail actifs et historique</p>
          </div>
        </div>
        <button routerLink="nouveau" class="btn-primary page-btn">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          <span class="page-btn-full">Nouveau bail</span>
          <span class="page-btn-short">Nouveau</span>
        </button>
      </div>

      <!-- ── FILTRES ── -->
      <div class="bg-white border-b border-gray-100 px-6 py-2 flex flex-wrap gap-2">
        @for (f of filtres; track f.val) {
          <button
            class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
            [class]="filtreActif() === f.val ? 'bg-blue-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            (click)="filtreActif.set(f.val)">
            {{ f.label }}
          </button>
        }
      </div>

      <div class="p-6">
        <!-- ── KPI cards ── -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Total</p>
            <p class="text-2xl font-bold" style="color:#111827">{{ totalBails() }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Actifs</p>
            <p class="text-2xl font-bold" style="color:#16a34a">{{ actifs() }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Expirés</p>
            <p class="text-2xl font-bold" style="color:#d97706">{{ expires() }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Résiliés</p>
            <p class="text-2xl font-bold" style="color:#dc2626">{{ resilies() }}</p>
          </div>
        </div>

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
                    <span>Début : <strong class="text-gray-700">{{ b.startDate | lokDate:'date' }}</strong></span>
                    @if (b.endDate) {
                      <span>Fin : <strong class="text-gray-700">{{ b.endDate | lokDate:'date' }}</strong></span>
                    }
                    @if (b.status === 'TERMINATED' && b.terminatedAt) {
                      <span>Résilié le : <strong class="text-red-600">{{ b.terminatedAt | lokDate }}</strong></span>
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
    .logo-img { height: 88px; width: auto; object-fit: contain; background: transparent !important; mix-blend-mode: multiply; }
    .page-header { background: white; border-bottom: 1px solid #E5E7EB; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .page-header-left { display: flex; align-items: center; gap: 16px; min-width: 0; }
    .page-divider { width: 1px; height: 32px; background: #E5E7EB; flex-shrink: 0; }
    .page-title { font-size: 22px; font-weight: 700; color: #111827; line-height: 1.2; white-space: nowrap; }
    .page-sub { font-size: 13px; color: #6B7280; margin-top: 1px; }
    .page-btn { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .page-btn-short { display: none; }
    .btn-primary { background: #0F4C81; color: white; border: none; border-radius: .625rem;
      padding: .625rem 1.25rem; font-size: .9rem; font-weight: 600; cursor: pointer;
      transition: background .2s; }
    .btn-primary:hover { background: #0A2650; }
    .btn-secondary { border: 1.5px solid #d1d5db; border-radius: .5rem;
      padding: .5rem .875rem; font-weight: 500; color: #374151; background: white;
      cursor: pointer; transition: border-color .2s; }
    .btn-secondary:hover { border-color: #0F4C81; color: #0F4C81; }
    @media (max-width: 640px) {
      .page-header { padding: 12px 16px 12px 64px; }
      .page-logo { display: none; }
      .page-divider { display: none; }
      .page-title { font-size: 18px; }
      .page-sub { display: none; }
      .page-btn-full { display: none; }
      .page-btn-short { display: inline; }
    }
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

  /** Getters KPI */
  totalBails(): number { return this.bails().length; }
  actifs(): number { return this.bails().filter(b => b.status === 'ACTIVE').length; }
  expires(): number { return this.bails().filter(b => b.status === 'EXPIRED').length; }
  resilies(): number { return this.bails().filter(b => b.status === 'TERMINATED').length; }
}

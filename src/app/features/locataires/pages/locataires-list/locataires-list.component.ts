import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LocatairesService, LocatairesFilters } from '../../services/locataires.service';
import { Locataire } from '@core/models/locataire.model';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-locataires-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LokSkeletonComponent,
    LokEmptyStateComponent,
  ],
  template: `
    <div class="min-h-screen" style="background:#F0F4FA">

      <!-- ── HEADER ── -->
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-logo">
            <img src="/assets/warah-icon.png" alt="" class="logo-img">
          </div>
          <div class="page-divider"></div>
          <div>
            <h1 class="page-title">Locataires</h1>
            <p class="page-sub">{{ locataires.length }} locataire{{ locataires.length !== 1 ? 's' : '' }}</p>
          </div>
        </div>
        <button [routerLink]="basePath + '/locataires/nouveau'" class="btn-primary page-btn">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          <span class="page-btn-full">Nouveau locataire</span>
          <span class="page-btn-short">Nouveau</span>
        </button>
      </div>

      <!-- ── KPI cards ── -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <p class="kpi-label">Total</p>
          <p class="kpi-val" style="color:#111827">{{ locataires.length }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Actifs</p>
          <p class="kpi-val" style="color:#16a34a">{{ countByStatus('ACTIVE') }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Inactifs</p>
          <p class="kpi-val" style="color:#6b7280">{{ countByStatus('INACTIVE') }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Suspendus</p>
          <p class="kpi-val" style="color:#dc2626">{{ countByStatus('SUSPENDED') }}</p>
        </div>
      </div>

      <!-- ── BARRE RECHERCHE ── -->
      <div class="px-6 mb-5">
        <div class="bg-white rounded-2xl shadow-xl border border-white/80 p-3 flex gap-3 flex-wrap items-center"
             style="box-shadow:0 8px 40px rgba(10,38,80,.13)">
          <div class="relative flex-1 min-w-56">
            <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" stroke="#9ca3af" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" [(ngModel)]="recherche" (ngModelChange)="applyFilters()"
              placeholder="Rechercher un locataire…"
              class="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border-0 bg-gray-50 focus:outline-none focus:ring-2 transition-all"/>
          </div>
          <div class="flex gap-1.5">
            @for (f of statusFilters; track f.val) {
              <button (click)="setFilter(f.val)" [class]="filterActive(f.val) ? 'ftab-on' : 'ftab-off'">
                @if (f.dot) { <span class="w-1.5 h-1.5 rounded-full inline-block" [style]="'background:'+f.dot"></span> }
                {{ f.label }}
              </button>
            }
          </div>
          @if (hasActiveFilters()) {
            <button (click)="clearAllFilters()" class="text-xs text-gray-400 hover:text-red-500 transition-colors px-1">✕</button>
          }
        </div>
      </div>

      <!-- ── LISTE ── -->
      <div class="px-6 pb-8">
        @if (loading) {
          <div class="space-y-3">
            @for (i of [1,2,3,4,5]; track i) {
              <lok-skeleton type="card"></lok-skeleton>
            }
          </div>
        } @else if (filteredLocataires.length === 0) {
          <lok-empty-state
            titre="Aucun locataire trouvé"
            description="Aucun locataire ne correspond à vos critères."
            ctaLabel="Ajouter un locataire"
            icon="locataire"
            (ctaAction)="navigateToNew()">
          </lok-empty-state>
        } @else {
          <div class="bg-white rounded-2xl overflow-hidden" style="box-shadow:0 4px 24px rgba(10,38,80,.08)">

            <!-- Thead -->
            <div class="hidden md:grid grid-cols-12 gap-2 px-5 py-3 border-b border-gray-100"
                 style="background:#F7F9FF">
              <div class="col-span-5 text-xs font-bold uppercase tracking-wider text-gray-400">Locataire</div>
              <div class="col-span-3 text-xs font-bold uppercase tracking-wider text-gray-400">Téléphone</div>
              <div class="col-span-2 text-xs font-bold uppercase tracking-wider text-gray-400">Statut</div>
              <div class="col-span-2"></div>
            </div>

            <div>
              @for (loc of filteredLocataires; track loc.id; let odd = $odd) {
                <div class="row-item grid grid-cols-12 gap-2 px-5 py-4 items-center cursor-pointer border-b border-gray-50 last:border-0"
                     [style]="odd ? 'background:#FAFBFF' : 'background:#fff'"
                     (click)="viewLocataire(loc.id)">

                  <!-- Avatar + nom -->
                  <div class="col-span-12 md:col-span-5 flex items-center gap-4">
                    <div class="avatar-circle w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-extrabold flex-shrink-0 select-none"
                         [style]="avatarGradient(loc.firstName)">
                      {{ loc.firstName.charAt(0) }}{{ loc.lastName.charAt(0) }}
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-bold text-gray-900 truncate leading-tight">{{ loc.firstName }} {{ loc.lastName }}</p>
                      <p class="text-xs text-gray-400 truncate mt-0.5">{{ loc.email ?? '—' }}</p>
                    </div>
                  </div>

                  <!-- Téléphone -->
                  <div class="hidden md:flex col-span-3 items-center gap-2 text-sm text-gray-500">
                    <svg class="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.22 2.18 2 2 0 012.18 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.56-.56a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z"/></svg>
                    {{ loc.phone ?? '—' }}
                  </div>

                  <!-- Statut -->
                  <div class="hidden md:flex col-span-2">
                    <span class="status-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                          [class]="statusBadge(loc.accountStatus)">
                      <span class="status-dot w-1.5 h-1.5 rounded-full" [ngClass]="{
                        'bg-green-500': loc.accountStatus==='ACTIVE',
                        'bg-gray-400': loc.accountStatus==='INACTIVE',
                        'bg-red-500': loc.accountStatus==='SUSPENDED'
                      }"></span>
                      {{ loc.accountStatus==='ACTIVE' ? 'Actif' : loc.accountStatus==='INACTIVE' ? 'Inactif' : 'Suspendu' }}
                    </span>
                  </div>

                  <!-- Action -->
                  <div class="hidden md:flex col-span-2 justify-end gap-2">
                    <button (click)="viewLocataire(loc.id); $event.stopPropagation()"
                      class="action-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style="background:var(--color-primary-50);color:var(--color-primary)">
                      Voir
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Footer -->
            <div class="px-5 py-3 flex justify-between items-center border-t border-gray-50" style="background:#F7F9FF">
              <span class="text-xs text-gray-400">{{ filteredLocataires.length }} / {{ locataires.length }} locataire{{ locataires.length!==1?'s':'' }}</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .logo-img { height: 34px; width: auto; display: block; }
    .page-header { background: white; border-bottom: 1px solid #E5E7EB; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .page-header-left { display: flex; align-items: center; gap: 16px; min-width: 0; }
    .page-divider { width: 1px; height: 32px; background: #E5E7EB; flex-shrink: 0; }
    .page-title { font-size: 22px; font-weight: 700; color: #111827; line-height: 1.2; white-space: nowrap; }
    .page-sub { font-size: 13px; color: #6B7280; margin-top: 1px; }
    .page-btn { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .page-btn-short { display: none; }
    .btn-primary { background: var(--color-primary); color: white; border: none; border-radius: .625rem; padding: .625rem 1.25rem; font-weight: 600; cursor: pointer; font-size: .9rem; transition: background .2s; }
    .btn-primary:hover { background: var(--color-primary-dark); }
    .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; padding:32px 24px 24px; }
    .kpi-card { background:#fff; border-radius:14px; padding:20px 24px; box-shadow:0 2px 12px rgba(10,38,80,.08); border:1px solid #E8EDF5; }
    .kpi-label { font-size:13px; color:#6B7280; margin-bottom:8px; font-weight:500; }
    .kpi-val { font-size:2.25rem; font-weight:800; line-height:1; }
    @media(max-width:768px){ .kpi-grid { grid-template-columns:repeat(2,1fr); gap:12px; padding:20px 16px 16px; } }
    .ftab-on  { padding:6px 14px; border-radius:10px; font-size:12px; font-weight:700; background:var(--color-primary); color:#fff; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:5px; transition:all .15s; }
    .ftab-off { padding:6px 14px; border-radius:10px; font-size:12px; font-weight:500; background:#F3F4F6; color:#6b7280; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:5px; transition:all .15s; }
    .ftab-off:hover { background:#E5E7EB; color:#374151; }
    .row-item { transition:background .15s, box-shadow .15s; }
    .row-item:hover { background:var(--color-primary-50) !important; box-shadow:inset 3px 0 0 var(--color-primary); }
    .status-badge { transition:all .15s; }
    .bg-green-500 { animation:pulse-green 2s infinite; }
    @keyframes pulse-green { 0%,100%{opacity:1} 50%{opacity:.6} }
    .action-btn:hover { background:var(--color-primary) !important; color:#fff !important; }
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
export class LocatairesListComponent implements OnInit {
  locataires: Locataire[] = [];
  filteredLocataires: Locataire[] = [];
  loading = true;

  recherche = '';
  filters: LocatairesFilters = {};

  statusFilters = [
    { val: '', label: 'Tous', dot: '' },
    { val: 'ACTIVE', label: 'Actifs', dot: '#4ade80' },
    { val: 'INACTIVE', label: 'Inactifs', dot: '#9ca3af' },
    { val: 'SUSPENDED', label: 'Suspendus', dot: '#f87171' },
  ];

  private avatarColors = [
    ['#0F4C81','#1a6ab8'], ['#0A2650','#0F4C81'], ['#C9982E','#e0b050'],
    ['#1d4ed8','#3b82f6'], ['#7c3aed','#a855f7'], ['#0d9488','#14b8a6'],
  ];

  avatarGradient(firstName: string): string {
    const idx = firstName.charCodeAt(0) % this.avatarColors.length;
    const [a, b] = this.avatarColors[idx];
    return `background:linear-gradient(135deg,${a},${b})`;
  }

  setFilter(val: string): void {
    this.filters.statut = val;
    this.applyFilters();
  }

  filterActive(val: string): boolean {
    return (this.filters.statut ?? '') === val;
  }

  basePath: string;

  constructor(
    private locatairesService: LocatairesService,
    private router: Router,
    private authService: AuthService,
  ) {
    this.basePath = this.authService.getWorkspacePrefix();
  }

  ngOnInit(): void {
    this.loadLocataires();
  }

  loadLocataires(): void {
    this.loading = true;
    this.locatairesService.getLocataires().subscribe({
      next: (data) => {
        this.locataires = data;
        this.filteredLocataires = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    this.filteredLocataires = this.locataires.filter((loc) => {
      if (this.filters.statut && loc.accountStatus !== this.filters.statut) return false;
      if (this.recherche) {
        const q = this.recherche.toLowerCase();
        const match =
          loc.firstName.toLowerCase().includes(q) ||
          loc.lastName.toLowerCase().includes(q) ||
          (loc.email ?? '').toLowerCase().includes(q) ||
          (loc.phone ?? '').includes(q);
        if (!match) return false;
      }
      return true;
    });
  }

  hasActiveFilters(): boolean {
    return !!(this.filters.statut || this.recherche);
  }

  clearAllFilters(): void {
    this.filters = {};
    this.recherche = '';
    this.filteredLocataires = [...this.locataires];
  }

  countByStatus(status: string): number {
    return this.locataires.filter((l) => l.accountStatus === status).length;
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'ACTIVE':    return 'bg-green-100 text-green-800';
      case 'INACTIVE':  return 'bg-gray-100 text-gray-800';
      case 'SUSPENDED': return 'bg-red-100 text-red-800';
      default:          return 'bg-gray-100 text-gray-800';
    }
  }

  viewLocataire(id: string): void {
    this.router.navigate([this.basePath, 'locataires', id]);
  }

  navigateToNew(): void {
    this.router.navigate([this.basePath, 'locataires', 'nouveau']);
  }
}

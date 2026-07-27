import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { CommonModule } from '@angular/common';
import { GestionnaireService, ExportRequest, ExportRecord } from '../../../gestionnaire/services/gestionnaire.service';
import { LokDatePipe } from '../../../../shared/pipes/lok-date.pipe';

@Component({
  selector: 'app-export',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LokAlerteComponent,
    LokSkeletonComponent,
    LokDatePipe
  ],
  template: `
    <div class="min-h-screen" style="background:#F0F4FA">

      <!-- ── HEADER ── -->
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-logo">
            <img src="/assets/WARAH-logo.png" alt="WARAH" class="logo-img">
          </div>
          <div class="page-divider"></div>
          <div>
            <h1 class="page-title">Export</h1>
            <p class="page-sub">Téléchargez vos données en PDF, Excel ou CSV</p>
          </div>
        </div>
      </div>

      <div class="px-6 pb-8 max-w-4xl mx-auto mt-6">

        @if (errorMessage) { <lok-alerte type="error" [message]="errorMessage" class="mb-4 block"></lok-alerte> }
        @if (successMessage) { <lok-alerte type="success" [message]="successMessage" class="mb-4 block"></lok-alerte> }

        <!-- Modèles rapides -->
        <div class="bg-white rounded-2xl overflow-hidden mb-5" style="box-shadow:0 4px 24px rgba(10,38,80,.08)">
          <div class="px-6 py-4 border-b border-gray-100" style="background:#F7F9FF">
            <h2 class="text-sm font-bold text-gray-700">Modèles rapides</h2>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              @for (tpl of modeles; track tpl.key) {
                <button (click)="utiliserModele(tpl.key)"
                  class="tpl-card text-left rounded-xl p-4 transition-all border border-gray-100 bg-gray-50 hover:bg-white">
                  <div class="flex items-center gap-3 mb-2">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center" [style]="'background:'+tpl.iconBg">
                      <svg class="w-4 h-4" fill="none" [attr.stroke]="tpl.iconColor" stroke-width="2" viewBox="0 0 24 24"><path [attr.d]="tpl.icon"/></svg>
                    </div>
                    <span class="font-bold text-gray-800 text-sm">{{ tpl.label }}</span>
                  </div>
                  <p class="text-xs text-gray-500">{{ tpl.desc }}</p>
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Formulaire -->
        <div class="bg-white rounded-2xl overflow-hidden mb-5" style="box-shadow:0 8px 40px rgba(10,38,80,.12)">
          <div class="px-6 py-4 border-b border-gray-100" style="background:#F7F9FF">
            <h2 class="text-sm font-bold text-gray-700">Configurer l'export</h2>
          </div>
          <div class="p-6">
            <form [formGroup]="exportForm" (ngSubmit)="exporterDonnees()" class="space-y-5">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Type</label>
                  <select formControlName="typeDonnees"
                    class="w-full text-sm rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all bg-white">
                    <option value="biens">Biens immobiliers</option>
                    <option value="locataires">Locataires</option>
                    <option value="paiements">Paiements</option>
                    <option value="contrats">Contrats de bail</option>
                    <option value="rapports">Rapports globaux</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Format</label>
                  <div class="flex gap-2">
                    @for (fmt of [{v:'pdf',l:'PDF',c:'#ef4444',bg:'#FEF2F2'},{v:'excel',l:'Excel',c:'#16a34a',bg:'#F0FDF4'},{v:'csv',l:'CSV',c:'#2563eb',bg:'#EFF6FF'}]; track fmt.v) {
                      <button type="button" (click)="exportForm.patchValue({format:fmt.v})"
                        class="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border-2"
                        [style]="exportForm.value.format===fmt.v ? 'background:'+fmt.c+';color:#fff;border-color:'+fmt.c : 'background:'+fmt.bg+';color:'+fmt.c+';border-color:'+fmt.c+'40'">
                        {{ fmt.l }}
                      </button>
                    }
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Période</label>
                  <select formControlName="periode"
                    class="w-full text-sm rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all bg-white">
                    <option value="tout">Tout l'historique</option>
                    <option value="ce_mois">Ce mois</option>
                    <option value="ce_trimestre">Ce trimestre</option>
                    <option value="cette_annee">Cette année</option>
                    <option value="personnalise">Personnalisé</option>
                  </select>
                </div>
              </div>

              @if (exportForm.value.periode === 'personnalise') {
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Début</label>
                    <input type="date" formControlName="dateDebut" class="w-full text-sm rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"/>
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Fin</label>
                    <input type="date" formControlName="dateFin" class="w-full text-sm rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"/>
                  </div>
                </div>
              }

              <div formGroupName="champs">
                <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Champs à inclure</label>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                  @for (champ of [{k:'informationsGenerales',l:'Infos générales'},{k:'financiers',l:'Finances'},{k:'documents',l:'Documents'},{k:'historique',l:'Historique'}]; track champ.k) {
                    <label class="flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all select-none champ-label"
                           [class.champ-label--on]="exportForm.get('champs.'+champ.k)?.value">
                      <input type="checkbox" [formControlName]="champ.k" class="accent-blue-700 w-4 h-4 flex-shrink-0">
                      <span class="text-xs font-semibold text-gray-700">{{ champ.l }}</span>
                    </label>
                  }
                </div>
              </div>

              <button type="submit" [disabled]="exportForm.invalid || isExporting"
                class="flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95"
                style="background:linear-gradient(135deg,#0F4C81,#1a6ab8);color:#fff;box-shadow:0 4px 20px rgba(15,76,129,.3)">
                @if (isExporting) {
                  <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  Génération en cours…
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Générer et télécharger
                }
              </button>
            </form>
          </div>
        </div>

        <!-- Exports récents -->
        <div class="bg-white rounded-2xl overflow-hidden" style="box-shadow:0 4px 24px rgba(10,38,80,.08)">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style="background:#F7F9FF">
            <h2 class="text-sm font-bold text-gray-700">Exports récents</h2>
            <span class="text-xs text-gray-400">{{ exportsRecents.length }} fichier{{ exportsRecents.length!==1?'s':'' }}</span>
          </div>
          @if (loadingExports) {
            <div class="p-6"><lok-skeleton type="text"></lok-skeleton></div>
          } @else if (exportsRecents.length === 0) {
            <div class="p-10 text-center">
              <div class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style="background:#EEF4FF">
                <svg class="w-7 h-7" fill="none" stroke="#0F4C81" stroke-width="1.5" viewBox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              </div>
              <p class="font-bold text-gray-700 mb-1">Aucun export récent</p>
              <p class="text-xs text-gray-400">Vos fichiers générés apparaîtront ici.</p>
            </div>
          } @else {
            <div class="divide-y divide-gray-50">
              @for (exp of exportsRecents; track exp.id) {
                <div class="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors">
                  <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                       [class]="exp.format==='pdf' ? 'bg-red-100' : exp.format==='excel' ? 'bg-green-100' : 'bg-blue-100'">
                    <svg class="w-5 h-5" [class]="exp.format==='pdf' ? 'text-red-600' : exp.format==='excel' ? 'text-green-600' : 'text-blue-600'"
                         fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-gray-900 truncate">{{ exp.titre }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{{ exp.date | lokDate }} · <span class="font-semibold uppercase">{{ exp.format }}</span></p>
                  </div>
                  <div class="flex gap-2 flex-shrink-0">
                    <button (click)="telechargerExport(exp.id)" [disabled]="downloadingId === exp.id"
                      class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 btn-dl">
                      @if (downloadingId === exp.id) {
                        <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                        …
                      } @else {
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3"/><rect x="3" y="17" width="18" height="4" rx="1"/></svg>
                        Télécharger
                      }
                    </button>
                    <button (click)="demanderSuppression(exp.id)"
                      class="w-9 h-9 rounded-xl flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Modale confirmation suppression -->
    @if (exportASupprimer) {
      <div class="confirm-overlay" (click)="exportASupprimer = null">
        <div class="confirm-box" (click)="$event.stopPropagation()">
          <div class="confirm-icon">
            <svg width="28" height="28" fill="none" stroke="#ef4444" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </div>
          <h3 class="confirm-title">Supprimer cet export ?</h3>
          <p class="confirm-text">Cette action est irréversible. Le fichier sera définitivement supprimé.</p>
          <div class="confirm-actions">
            <button type="button" class="confirm-btn confirm-btn--cancel" (click)="exportASupprimer = null">Annuler</button>
            <button type="button" class="confirm-btn confirm-btn--delete" (click)="confirmerSuppression()">Supprimer</button>
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
    .tpl-card { transition: all .2s; }
    .tpl-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(10,38,80,.08); }
    .btn-dl { background: var(--color-primary); color: #fff; }
    .btn-dl:hover:not(:disabled) { background: var(--color-primary-dark); }
    .champ-label { border-color: #E5E7EB; background: #FAFAFA; }
    .champ-label--on { border-color: var(--color-primary) !important; background: #EEF4FC !important; }

    /* Modale suppression */
    .confirm-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 1rem;
    }
    .confirm-box {
      background: white; border-radius: 16px; padding: 2rem;
      width: 100%; max-width: 380px; text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,.2);
    }
    .confirm-icon {
      width: 56px; height: 56px; border-radius: 50%; background: #FEF2F2;
      display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;
    }
    .confirm-title { font-size: 1.125rem; font-weight: 700; color: #111827; margin-bottom: .5rem; }
    .confirm-text { font-size: .875rem; color: #6B7280; line-height: 1.5; margin-bottom: 1.5rem; }
    .confirm-actions { display: flex; gap: .75rem; }
    .confirm-btn {
      flex: 1; min-height: 44px; border: none; border-radius: 10px;
      font-size: .875rem; font-weight: 600; cursor: pointer; transition: all .15s;
    }
    .confirm-btn--cancel { background: #F3F4F6; color: #374151; }
    .confirm-btn--cancel:hover { background: #E5E7EB; }
    .confirm-btn--delete { background: #ef4444; color: white; }
    .confirm-btn--delete:hover { background: #dc2626; }

    @media (max-width: 640px) {
      .page-header { padding: 12px 16px; }
      .page-logo { display: none; }
      .page-divider { display: none; }
      .page-title { font-size: 18px; }
      .page-sub { display: none; }
    }
  `],
})
export class ExportComponent implements OnInit {
  exportForm: FormGroup;
  exportsRecents: ExportRecord[] = [];
  isExporting = false;
  downloadingId: string | null = null;
  exportASupprimer: string | null = null;
  loadingExports = false;
  errorMessage = '';
  successMessage = '';

  modeles = [
    {
      key: 'rapport_mensuel', label: 'Rapport mensuel', desc: 'Export complet des données du mois',
      bg: '#EFF6FF', border: '#BFDBFE', iconBg: '#DBEAFE', iconColor: '#2563EB',
      icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    {
      key: 'etats_financiers', label: 'États financiers', desc: 'Revenus, dépenses et bénéfices',
      bg: '#F0FDF4', border: '#BBF7D0', iconBg: '#DCFCE7', iconColor: '#16A34A',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      key: 'inventaire', label: 'Inventaire biens', desc: 'Liste complète des biens immobiliers',
      bg: '#FAF5FF', border: '#DDD6FE', iconBg: '#EDE9FE', iconColor: '#7C3AED',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private gestionnaireService: GestionnaireService
  ) {
    this.exportForm = this.fb.group({
      typeDonnees: ['biens', Validators.required],
      format: ['pdf', Validators.required],
      periode: ['ce_mois', Validators.required],
      dateDebut: [''],
      dateFin: [''],
      champs: this.fb.group({
        informationsGenerales: [true],
        financiers: [true],
        documents: [false],
        historique: [false]
      })
    });
  }

  ngOnInit(): void {
    this.chargerExports();
  }

  private chargerExports(): void {
    this.loadingExports = true;
    this.gestionnaireService.getExports().subscribe({
      next: (data) => { this.exportsRecents = data; this.loadingExports = false; },
      error: () => { this.loadingExports = false; }
    });
  }

  exporterDonnees(): void {
    if (this.exportForm.invalid) return;

    this.isExporting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const v = this.exportForm.value;
    const req: ExportRequest = {
      type: v.typeDonnees,
      format: v.format as 'pdf' | 'excel',
      dateDebut: v.dateDebut || undefined,
      dateFin: v.dateFin || undefined
    };

    this.gestionnaireService.exporterDonnees(req).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export-${req.type}.${req.format}`;
        a.click();
        URL.revokeObjectURL(url);
        this.isExporting = false;
        this.successMessage = 'Export téléchargé avec succès !';
        this.chargerExports();
        setTimeout(() => { this.successMessage = ''; }, 3000);
      },
      error: () => {
        this.isExporting = false;
        this.errorMessage = 'Erreur lors de la génération de l\'export';
      }
    });
  }

  telechargerExport(exportId: string): void {
    this.downloadingId = exportId;
    const exp = this.exportsRecents.find(e => e.id === exportId);
    this.gestionnaireService.telechargerExport(exportId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export-${exportId}.${exp?.format ?? 'pdf'}`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloadingId = null;
      },
      error: () => { this.downloadingId = null; }
    });
  }

  demanderSuppression(exportId: string): void {
    this.exportASupprimer = exportId;
  }

  confirmerSuppression(): void {
    if (!this.exportASupprimer) return;
    const id = this.exportASupprimer;
    this.exportASupprimer = null;
    this.gestionnaireService.supprimerExport(id).subscribe({
      next: () => {
        this.exportsRecents = this.exportsRecents.filter(e => e.id !== id);
      },
      error: () => {
        this.errorMessage = 'Erreur lors de la suppression';
        setTimeout(() => { this.errorMessage = ''; }, 3000);
      }
    });
  }

  utiliserModele(modele: string): void {
    switch (modele) {
      case 'rapport_mensuel':
        this.exportForm.patchValue({
          typeDonnees: 'rapports',
          format: 'pdf',
          periode: 'ce_mois',
          champs: {
            informationsGenerales: true,
            financiers: true,
            documents: true,
            historique: true
          }
        });
        break;
      case 'etats_financiers':
        this.exportForm.patchValue({
          typeDonnees: 'paiements',
          format: 'excel',
          periode: 'ce_trimestre',
          champs: {
            informationsGenerales: false,
            financiers: true,
            documents: false,
            historique: true
          }
        });
        break;
      case 'inventaire':
        this.exportForm.patchValue({
          typeDonnees: 'biens',
          format: 'excel',
          periode: 'tout',
          champs: {
            informationsGenerales: true,
            financiers: true,
            documents: false,
            historique: false
          }
        });
        break;
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PaiementsService } from '../../services/paiements.service';
import { Payment, PaymentStatus, PAYMENT_METHOD_LABELS } from '@core/models/payment.model';
import { LokMontantFcfaComponent } from '../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component';
import { LokBadgePaiementComponent } from '../../../../shared/components/lok-badge-paiement/lok-badge-paiement.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokConfirmModalComponent } from '../../../../shared/components/lok-confirm-modal/lok-confirm-modal.component';
import { LokDatePipe } from '../../../../shared/pipes/lok-date.pipe';
import { AuthService } from '../../../../core/services/auth.service';

const STATUS_TABS: { value: PaymentStatus | ''; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'PENDING_CONFIRMATION', label: 'À confirmer' },
  { value: 'PAID', label: 'Payés' },
  { value: 'LATE', label: 'En retard' },
  { value: 'OVERDUE', label: 'Impayés' },
  { value: 'REJECTED', label: 'Rejetés' },
];

@Component({
  selector: 'app-paiements-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LokMontantFcfaComponent,
    LokBadgePaiementComponent,
    LokSkeletonComponent,
    LokEmptyStateComponent,
    LokAlerteComponent,
    LokConfirmModalComponent,
    LokDatePipe,
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="pmt-header">
        <div class="pmt-header-left">
          <div class="logo pmt-logo-desktop">
            <img src="/assets/warah-icon.png" alt="WARAH" class="logo-img">
          </div>
          <div class="pmt-divider"></div>
          <div>
            <h1 class="pmt-title">Paiements</h1>
            <p class="pmt-sub">Loyers reçus, déclarations et quittances</p>
          </div>
        </div>
        <button [routerLink]="basePath + '/paiements/nouveau'" class="btn-primary pmt-btn">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          <span class="pmt-btn-full">Enregistrer un paiement</span>
          <span class="pmt-btn-short">Nouveau</span>
        </button>
      </div>

      <div class="p-6">
        @if (successMessage) {
          <lok-alerte type="success" [message]="successMessage" class="mb-4 block"></lok-alerte>
        }
        @if (errorMessage) {
          <lok-alerte type="error" [message]="errorMessage" class="mb-4 block"></lok-alerte>
        }

        <!-- Onglets de statut -->
        <div class="status-tabs">
          @for (tab of statusTabs; track tab.value) {
            <button
              class="status-tab"
              [class.status-tab-on]="filters.status === tab.value"
              (click)="setStatusFilter(tab.value)"
            >{{ tab.label }}</button>
          }
        </div>

        <!-- Liste -->
        @if (loading) {
          <div class="space-y-4">
            @for (i of [1, 2, 3, 4, 5]; track i) {
              <lok-skeleton type="card"></lok-skeleton>
            }
          </div>
        } @else if (payments.length === 0) {
          <lok-empty-state
            titre="Aucun paiement trouvé"
            description="Aucun paiement ne correspond à ce filtre."
            ctaLabel="Enregistrer un paiement"
            icon="paiement"
            (ctaAction)="navigateToNew()"
          ></lok-empty-state>
        } @else {
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Locataire</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bien</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                @for (p of payments; track p.id) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {{ (p.paidAt ?? p.createdAt) | lokDate }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {{ p.lease?.tenant ? (p.lease!.tenant.firstName + ' ' + p.lease!.tenant.lastName) : '—' }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {{ p.lease?.property ? (p.lease!.property.neighborhood + ', ' + p.lease!.property.city) : '—' }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <lok-montant-fcfa [montant]="p.paidAmount" size="sm"></lok-montant-fcfa>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {{ p.paymentMethod ? methodLabels[p.paymentMethod] : '—' }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <lok-badge-paiement [statut]="p.status"></lok-badge-paiement>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div class="flex items-center gap-3">
                        @if (p.status === 'PENDING_CONFIRMATION') {
                          <button (click)="confirmPayment(p)" class="text-green-600 hover:text-green-800 font-medium text-xs" [disabled]="actioningId === p.id">
                            Confirmer
                          </button>
                          <button (click)="rejectPayment(p)" class="text-red-600 hover:text-red-800 font-medium text-xs" [disabled]="actioningId === p.id">
                            Rejeter
                          </button>
                        }
                        @if (p.status === 'PAID') {
                          <button (click)="downloadReceipt(p)" class="text-gray-600 hover:text-primary transition-colors" title="Télécharger la quittance" [disabled]="downloadingId === p.id">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                          </button>
                        }
                        @if (p.status === 'REJECTED' && p.rejectionReason) {
                          <span class="text-xs text-gray-400 italic" [title]="p.rejectionReason">Motif : {{ p.rejectionReason }}</span>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            </div>
          </div>

          <!-- Pagination -->
          @if (total > limit) {
            <div class="pagination">
              <button class="page-btn" [disabled]="page === 1" (click)="goToPage(page - 1)">← Précédent</button>
              <span class="page-info">Page {{ page }} sur {{ totalPages }}</span>
              <button class="page-btn" [disabled]="page >= totalPages" (click)="goToPage(page + 1)">Suivant →</button>
            </div>
          }
        }

        @if (rejectingPayment) {
          <lok-confirm-modal
            titre="Rejeter la déclaration"
            message="Ce paiement sera marqué comme rejeté et le locataire en sera informé."
            confirmLabel="Rejeter"
            cancelLabel="Annuler"
            reasonLabel="Motif du rejet (communiqué au locataire)"
            reasonPlaceholder="Ex : montant ne correspond pas à l'échéance"
            (onConfirm)="onRejectConfirmed($event)"
            (onCancel)="rejectingPayment = null"
          ></lok-confirm-modal>
        }
      </div>
    </div>
  `,
  styles: [`
    .logo-img { height: 32px; width: auto; object-fit: contain; }

    .pmt-header {
      background: white; border-bottom: 1px solid #E5E7EB; padding: 16px 24px;
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
    }
    .pmt-header-left { display: flex; align-items: center; gap: 16px; min-width: 0; }
    .pmt-divider { width: 1px; height: 32px; background: #E5E7EB; flex-shrink: 0; }
    .pmt-title { font-size: 22px; font-weight: 700; color: #111827; line-height: 1.2; white-space: nowrap; }
    .pmt-sub { font-size: 13px; color: #6B7280; margin-top: 1px; }
    .pmt-btn { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .pmt-btn-short { display: none; }

    @media (max-width: 640px) {
      .pmt-header { padding: 12px 16px 12px 64px; }
      .pmt-logo-desktop { display: none; }
      .pmt-divider { display: none; }
      .pmt-title { font-size: 18px; }
      .pmt-sub { display: none; }
      .pmt-btn-full { display: none; }
      .pmt-btn-short { display: inline; }
      .pmt-btn { padding: 8px 14px; font-size: 13px; }
    }

    .status-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
    .status-tab {
      background: white; border: 1px solid #E5E7EB; border-radius: 999px; padding: 7px 16px;
      font-size: 13px; font-weight: 600; color: #4B5563; cursor: pointer; transition: all .15s;
    }
    .status-tab:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .status-tab-on { background: var(--color-primary); border-color: var(--color-primary); color: white; }

    .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
    .page-btn { background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; }
    .page-btn:disabled { opacity: .4; cursor: not-allowed; }
    .page-info { font-size: 13px; color: #6B7280; }
  `],
})
export class PaiementsListComponent implements OnInit {
  payments: Payment[] = [];
  loading = true;
  successMessage = '';
  errorMessage = '';
  actioningId: string | null = null;
  downloadingId: string | null = null;
  rejectingPayment: Payment | null = null;

  statusTabs = STATUS_TABS;
  methodLabels = PAYMENT_METHOD_LABELS;

  page = 1;
  limit = 20;
  total = 0;

  filters: { status: PaymentStatus | '' } = { status: '' };
  basePath: string;

  constructor(
    private paiementsService: PaiementsService,
    private router: Router,
    private authService: AuthService,
  ) {
    this.basePath = this.authService.getWorkspacePrefix();
  }

  ngOnInit(): void {
    this.load();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  load(): void {
    this.loading = true;
    this.paiementsService
      .list({ page: this.page, limit: this.limit, status: this.filters.status || undefined })
      .subscribe({
        next: (res) => {
          this.payments = res.data;
          this.total = res.total;
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Erreur lors du chargement des paiements';
          this.loading = false;
        },
      });
  }

  setStatusFilter(status: PaymentStatus | ''): void {
    this.filters.status = status;
    this.page = 1;
    this.load();
  }

  goToPage(page: number): void {
    this.page = page;
    this.load();
  }

  confirmPayment(p: Payment): void {
    this.actioningId = p.id;
    this.paiementsService.confirm(p.id).subscribe({
      next: () => {
        this.actioningId = null;
        this.successMessage = 'Paiement confirmé.';
        setTimeout(() => (this.successMessage = ''), 3000);
        this.load();
      },
      error: (err) => {
        this.actioningId = null;
        this.errorMessage = err.error?.message || 'Erreur lors de la confirmation';
        setTimeout(() => (this.errorMessage = ''), 4000);
      },
    });
  }

  rejectPayment(p: Payment): void {
    this.rejectingPayment = p;
  }

  onRejectConfirmed(reason: string | undefined): void {
    const p = this.rejectingPayment;
    this.rejectingPayment = null;
    if (!p || !reason) return;
    this.actioningId = p.id;
    this.paiementsService.reject(p.id, reason).subscribe({
      next: () => {
        this.actioningId = null;
        this.successMessage = 'Déclaration rejetée.';
        setTimeout(() => (this.successMessage = ''), 3000);
        this.load();
      },
      error: (err) => {
        this.actioningId = null;
        this.errorMessage = err.error?.message || 'Erreur lors du rejet';
        setTimeout(() => (this.errorMessage = ''), 4000);
      },
    });
  }

  downloadReceipt(p: Payment): void {
    this.downloadingId = p.id;
    this.paiementsService.downloadReceipt(p.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quittance-${p.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloadingId = null;
      },
      error: () => {
        this.downloadingId = null;
        this.errorMessage = 'Erreur lors du téléchargement de la quittance';
        setTimeout(() => (this.errorMessage = ''), 4000);
      },
    });
  }

  navigateToNew(): void {
    this.router.navigate([this.basePath, 'paiements', 'nouveau']);
  }
}

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PaiementsService } from '../../services/paiements.service';
import { BiensService } from '../../../biens/services/biens.service';
import { Bien } from '@core/models/bien.model';
import { LeaseHistoryEntry, PaymentScheduleEntry } from '@core/models/payment.model';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-paiement-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LokAlerteComponent, LokSkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Enregistrer un paiement</h1>
            <p class="text-sm text-gray-600">Paiement reçu hors plateforme (espèces ou virement)</p>
          </div>
          <button [routerLink]="basePath + '/paiements'" class="btn-secondary">Annuler</button>
        </div>
      </div>

      <div class="p-6 max-w-2xl mx-auto">
        @if (errorMessage) {
          <lok-alerte type="error" [message]="errorMessage"></lok-alerte>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">1. Bien concerné</h2>
            @if (loadingBiens) {
              <lok-skeleton type="text"></lok-skeleton>
            } @else {
              <select formControlName="propertyId" (change)="onPropertyChange()" class="input-field">
                <option value="">Sélectionnez un bien</option>
                @for (bien of biens; track bien.id) {
                  <option [value]="bien.id">{{ bien.neighborhood }} — {{ bien.city }}</option>
                }
              </select>
            }
          </div>

          @if (propertyControl.value) {
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">2. Bail / locataire</h2>
              @if (loadingLeases) {
                <lok-skeleton type="text"></lok-skeleton>
              } @else if (leases.length === 0) {
                <p class="text-sm text-gray-500">Aucun bail actif pour ce bien.</p>
              } @else {
                <select formControlName="leaseId" (change)="onLeaseChange()" class="input-field">
                  <option value="">Sélectionnez un locataire</option>
                  @for (lease of leases; track lease.id) {
                    <option [value]="lease.id">{{ lease.tenant.firstName }} {{ lease.tenant.lastName }} — {{ lease.status === 'ACTIVE' ? 'Bail actif' : 'Bail terminé' }}</option>
                  }
                </select>
              }
            </div>
          }

          @if (leaseControl.value) {
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">3. Échéance réglée</h2>
              @if (loadingSchedule) {
                <lok-skeleton type="text"></lok-skeleton>
              } @else if (dueEntries.length === 0) {
                <p class="text-sm text-gray-500">Aucune échéance en attente pour ce bail.</p>
              } @else {
                <select formControlName="scheduleEntryId" (change)="onScheduleChange()" class="input-field">
                  <option value="">Sélectionnez une échéance</option>
                  @for (entry of dueEntries; track entry.id) {
                    <option [value]="entry.id">
                      {{ entry.periodStart | date:'MMM y' }} — reste {{ entry.expectedAmount - entry.paidAmount }} FCFA ({{ entry.status }})
                    </option>
                  }
                </select>
              }
            </div>
          }

          @if (scheduleControl.value) {
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">4. Détails du paiement</h2>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Montant payé (FCFA) *</label>
                  <input type="number" formControlName="paidAmount" class="input-field" placeholder="Ex: 100000">
                  @if (form.get('paidAmount')?.touched && form.get('paidAmount')?.invalid) {
                    <p class="text-red-500 text-xs mt-1">Montant requis (minimum 1 FCFA)</p>
                  }
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Date effective du paiement *</label>
                  <input type="date" formControlName="paidAt" class="input-field">
                  @if (form.get('paidAt')?.touched && form.get('paidAt')?.invalid) {
                    <p class="text-red-500 text-xs mt-1">Date requise</p>
                  }
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Mode de paiement *</label>
                  <select formControlName="paymentMethod" class="input-field">
                    <option value="">Sélectionnez un mode</option>
                    <option value="CASH">Espèces</option>
                    <option value="BANK_TRANSFER">Virement bancaire</option>
                  </select>
                  <p class="text-xs text-gray-500 mt-1">T-Money et Flooz arrivent avec l'intégration Cashpay — pas encore disponibles ici.</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Note (optionnel)</label>
                  <textarea formControlName="note" rows="2" class="input-field" placeholder="Précisions utiles"></textarea>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Justificatif (optionnel)</label>
                  <input type="file" accept="image/*,.pdf" (change)="onProofSelected($event)" class="input-field">
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-3">
              <button type="button" [routerLink]="basePath + '/paiements'" class="btn-secondary">Annuler</button>
              <button type="submit" [disabled]="form.invalid || isSubmitting" class="btn-primary">
                @if (isSubmitting) {
                  Enregistrement…
                } @else {
                  Enregistrer le paiement
                }
              </button>
            </div>
          }
        </form>
      </div>
    </div>
  `,
})
export class PaiementFormComponent implements OnInit {
  form: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  biens: Bien[] = [];
  loadingBiens = false;

  leases: LeaseHistoryEntry[] = [];
  loadingLeases = false;

  schedule: PaymentScheduleEntry[] = [];
  loadingSchedule = false;

  proofFile?: File;
  basePath: string;

  constructor(
    private fb: FormBuilder,
    private paiementsService: PaiementsService,
    private biensService: BiensService,
    private router: Router,
    private authService: AuthService,
  ) {
    this.basePath = this.authService.getWorkspacePrefix();
    this.form = this.fb.group({
      propertyId: [''],
      leaseId: [''],
      scheduleEntryId: [''],
      paidAmount: ['', [Validators.required, Validators.min(1)]],
      paidAt: ['', Validators.required],
      paymentMethod: ['', Validators.required],
      note: [''],
    });
  }

  get propertyControl() { return this.form.get('propertyId')!; }
  get leaseControl() { return this.form.get('leaseId')!; }
  get scheduleControl() { return this.form.get('scheduleEntryId')!; }

  get dueEntries(): PaymentScheduleEntry[] {
    return this.schedule.filter(e => e.status !== 'PAID');
  }

  ngOnInit(): void {
    const today = new Date().toISOString().split('T')[0];
    this.form.patchValue({ paidAt: today });
    this.loadingBiens = true;
    this.biensService.getBiens().subscribe({
      next: (data) => { this.biens = data.data; this.loadingBiens = false; },
      error: () => { this.loadingBiens = false; },
    });
  }

  onPropertyChange(): void {
    this.leaseControl.setValue('');
    this.scheduleControl.setValue('');
    this.leases = [];
    this.schedule = [];
    const propertyId = this.propertyControl.value;
    if (!propertyId) return;
    this.loadingLeases = true;
    this.paiementsService.getPropertyLeaseHistory(propertyId).subscribe({
      next: (res) => { this.leases = res.data; this.loadingLeases = false; },
      error: () => { this.loadingLeases = false; },
    });
  }

  onLeaseChange(): void {
    this.scheduleControl.setValue('');
    this.schedule = [];
    const leaseId = this.leaseControl.value;
    if (!leaseId) return;
    this.loadingSchedule = true;
    this.paiementsService.getLeaseSchedule(leaseId).subscribe({
      next: (entries) => { this.schedule = entries; this.loadingSchedule = false; },
      error: () => { this.loadingSchedule = false; },
    });
  }

  onScheduleChange(): void {
    const entry = this.schedule.find(e => e.id === this.scheduleControl.value);
    if (entry) {
      this.form.patchValue({ paidAmount: entry.expectedAmount - entry.paidAmount });
    }
  }

  onProofSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.proofFile = file;
  }

  onSubmit(): void {
    if (this.form.invalid || !this.scheduleControl.value) return;
    this.isSubmitting = true;
    this.errorMessage = '';

    this.paiementsService.createManual({
      scheduleEntryId: this.scheduleControl.value,
      paidAmount: this.form.value.paidAmount,
      paidAt: new Date(this.form.value.paidAt).toISOString(),
      paymentMethod: this.form.value.paymentMethod,
      note: this.form.value.note || undefined,
      proof: this.proofFile,
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate([this.basePath, 'paiements']);
      },
      error: (error: any) => {
        this.isSubmitting = false;
        this.errorMessage = error.error?.message || 'Erreur lors de l\'enregistrement du paiement';
      },
    });
  }
}

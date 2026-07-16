import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BailsService } from '../../services/bails.service';
import { LocatairesService } from '../../../locataires/services/locataires.service';
import { BiensService } from '../../../biens/services/biens.service';
import { Locataire } from '@core/models/locataire.model';
import { Bien, PROPERTY_TYPE_LABELS } from '@core/models/bien.model';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';

@Component({
  selector: 'app-bail-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LokAlerteComponent, LokSkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Nouveau bail</h1>
            <p class="text-sm text-gray-600">Créer un contrat de bail entre un bien et un locataire</p>
          </div>
          <button routerLink="/dashboard/bails" class="btn-secondary">Annuler</button>
        </div>
      </div>

      <div class="p-6 max-w-3xl mx-auto space-y-6">
        @if (errorMsg()) {
          <lok-alerte type="error" [message]="errorMsg()"></lok-alerte>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">

          <!-- Bien & locataire -->
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Bien & locataire</h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Bien *</label>
                @if (loadingBiens()) { <lok-skeleton type="text"></lok-skeleton> }
                @else {
                  <select formControlName="propertyId" class="input-field" (change)="onBienChange()">
                    <option value="">Sélectionner un bien…</option>
                    @for (b of biens; track b.id) {
                      <option [value]="b.id">{{ typeLabel(b.type) }} — {{ b.neighborhood }}, {{ b.city }}</option>
                    }
                  </select>
                  @if (selectedBien) {
                    <p class="text-sm text-blue-600 mt-1">Loyer actuel : <strong>{{ selectedBien.monthlyRent | number }} FCFA</strong></p>
                  }
                }
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Locataire *</label>
                @if (loadingLocataires()) { <lok-skeleton type="text"></lok-skeleton> }
                @else {
                  <select formControlName="tenantId" class="input-field">
                    <option value="">Sélectionner un locataire…</option>
                    @for (l of locataires; track l.id) {
                      <option [value]="l.id">{{ l.firstName }} {{ l.lastName }} — {{ l.email ?? l.phone }}</option>
                    }
                  </select>
                  <p class="text-xs text-gray-400 mt-1">Seuls les locataires invités via WARAH apparaissent ici.</p>
                }
              </div>
            </div>
          </div>

          <!-- Conditions financières -->
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Conditions financières</h2>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Loyer mensuel (FCFA) *</label>
                <input formControlName="monthlyRent" type="number" min="1" class="input-field" placeholder="Ex: 150000">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Charges (FCFA)</label>
                <input formControlName="monthlyCharges" type="number" min="0" class="input-field" placeholder="0">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Dépôt de garantie (FCFA) *</label>
                <input formControlName="securityDeposit" type="number" min="0" class="input-field">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Fréquence de paiement *</label>
                <select formControlName="paymentFrequency" class="input-field">
                  <option value="MONTHLY">Mensuel</option>
                  <option value="QUARTERLY">Trimestriel</option>
                  <option value="BIANNUAL">Semestriel</option>
                  <option value="ANNUAL">Annuel</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Durée du bail -->
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Durée du bail</h2>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Date de début *</label>
                <input formControlName="startDate" type="date" class="input-field">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Date de fin <small class="text-gray-400">(optionnel)</small></label>
                <input formControlName="endDate" type="date" class="input-field">
              </div>
            </div>
          </div>

          <!-- Options de rappel -->
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Rappels & alertes</h2>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Rappel avant échéance (jours)</label>
                <input formControlName="reminderDaysBefore" type="number" min="1" max="90" class="input-field" placeholder="7">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Délai alerte impayé (jours)</label>
                <input formControlName="overdueAlertWindowDays" type="number" min="1" max="90" class="input-field" placeholder="5">
              </div>
            </div>
            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">Conditions de restitution du dépôt</label>
              <textarea formControlName="depositReturnConditions" rows="3" class="input-field"
                placeholder="Ex: Restitution intégrale si aucun dégât constaté lors de l'état des lieux de sortie."></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <button type="button" routerLink="/dashboard/bails" class="btn-secondary">Annuler</button>
            <button type="submit" class="btn-primary" [disabled]="form.invalid || submitting()">
              @if (submitting()) { Création en cours… } @else { Créer le bail }
            </button>
          </div>

        </form>
      </div>
    </div>
  `,
})
export class BailFormComponent implements OnInit {
  form: FormGroup;
  submitting = signal(false);
  errorMsg = signal('');
  loadingBiens = signal(true);
  loadingLocataires = signal(true);

  biens: Bien[] = [];
  locataires: Locataire[] = [];
  selectedBien: Bien | null = null;

  constructor(
    private fb: FormBuilder,
    private bailsService: BailsService,
    private biensService: BiensService,
    private locatairesService: LocatairesService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.form = this.fb.group({
      propertyId:               ['', Validators.required],
      tenantId:                 ['', Validators.required],
      monthlyRent:              ['', [Validators.required, Validators.min(1)]],
      monthlyCharges:           [0, Validators.min(0)],
      securityDeposit:          [0, [Validators.required, Validators.min(0)]],
      paymentFrequency:         ['MONTHLY', Validators.required],
      startDate:                ['', Validators.required],
      endDate:                  [''],
      reminderDaysBefore:       [7],
      overdueAlertWindowDays:   [5],
      depositReturnConditions:  [''],
    });
  }

  ngOnInit(): void {
    // Pré-sélectionner le bien si passé en query param
    const propertyId = this.route.snapshot.queryParamMap.get('propertyId');

    this.biensService.getBiens({ status: 'VACANT' }).subscribe({
      next: (res) => {
        this.biens = res.data;
        if (propertyId) {
          this.form.patchValue({ propertyId });
          this.selectedBien = this.biens.find(b => b.id === propertyId) ?? null;
          if (this.selectedBien) {
            this.form.patchValue({
              monthlyRent:    this.selectedBien.monthlyRent,
              monthlyCharges: this.selectedBien.monthlyCharges ?? 0,
            });
          }
        }
        this.loadingBiens.set(false);
      },
      error: () => { this.loadingBiens.set(false); },
    });

    this.locatairesService.getLocataires().subscribe({
      next: (data) => { this.locataires = data; this.loadingLocataires.set(false); },
      error: () => { this.loadingLocataires.set(false); },
    });
  }

  onBienChange(): void {
    const id = this.form.value.propertyId;
    this.selectedBien = this.biens.find(b => b.id === id) ?? null;
    if (this.selectedBien) {
      this.form.patchValue({
        monthlyRent:    this.selectedBien.monthlyRent,
        monthlyCharges: this.selectedBien.monthlyCharges ?? 0,
      });
    }
  }

  typeLabel(type: string): string {
    return PROPERTY_TYPE_LABELS[type as keyof typeof PROPERTY_TYPE_LABELS] ?? type;
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.errorMsg.set('');

    const v = this.form.value;
    this.bailsService.createBail({
      propertyId:               v.propertyId,
      tenantId:                 v.tenantId,
      monthlyRent:              +v.monthlyRent,
      monthlyCharges:           +v.monthlyCharges,
      paymentFrequency:         v.paymentFrequency,
      startDate:                v.startDate,
      endDate:                  v.endDate || undefined,
      securityDeposit:          +v.securityDeposit,
      depositReturnConditions:  v.depositReturnConditions || undefined,
      reminderDaysBefore:       v.reminderDaysBefore ? +v.reminderDaysBefore : undefined,
      overdueAlertWindowDays:   v.overdueAlertWindowDays ? +v.overdueAlertWindowDays : undefined,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/dashboard/bails']);
      },
      error: (err: any) => {
        this.submitting.set(false);
        this.errorMsg.set(err.error?.message || 'Erreur lors de la création du bail.');
      },
    });
  }
}

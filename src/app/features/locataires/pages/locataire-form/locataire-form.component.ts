import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LocatairesService } from '../../services/locataires.service';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { environment } from '@env/environment';
import { AuthService } from '../../../../core/services/auth.service';
import { PaymentFrequency, PAYMENT_FREQUENCY_LABELS } from '@core/models/locataire.model';

interface PropertyItem {
  id: string;
  address: string;
  neighborhood: string;
  city: string;
  monthlyRent: number;
  monthlyCharges: number;
}

@Component({
  selector: 'app-locataire-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LokAlerteComponent],
  template: `
    <div class="min-h-screen" style="background:#F0F4FA">

      <!-- Header -->
      <div class="page-header">
        <div class="page-header-left">
          <div>
            <h1 class="page-title">Inviter un locataire</h1>
            <p class="page-sub">Un email d'activation sera envoyé automatiquement</p>
          </div>
        </div>
        <button [routerLink]="basePath + '/locataires'" class="btn-secondary">Annuler</button>
      </div>

      <div class="form-container">

        @if (successMessage) {
          <lok-alerte type="success" [message]="successMessage"></lok-alerte>
          @if (invitationUrl) {
            <div class="invitation-box">
              <p class="invitation-title">🔗 Lien d'activation</p>
              <p class="invitation-note">Un email a été envoyé au locataire. Vous pouvez aussi copier ce lien et le partager directement (WhatsApp, SMS…).</p>
              <input type="text" class="invitation-input" [value]="invitationUrl" readonly (click)="copyLink()">
              <button type="button" class="btn-copy" (click)="copyLink()">{{ copied ? '✓ Copié !' : 'Copier le lien' }}</button>
            </div>
          }
        }
        @if (errorMessage) {
          <lok-alerte type="error" [message]="errorMessage"></lok-alerte>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-card">

          <!-- Identité -->
          <div class="section-title">Identité du locataire</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="field-group">
              <label class="field-label">Prénom <span class="required">*</span></label>
              <input formControlName="firstName" type="text" class="field-input"
                placeholder="Ex : Koffi"
                [class.input-error]="touched('firstName') && form.get('firstName')?.invalid">
              @if (touched('firstName') && form.get('firstName')?.hasError('required')) {
                <p class="field-error">Le prénom est requis</p>
              }
            </div>
            <div class="field-group">
              <label class="field-label">Nom <span class="required">*</span></label>
              <input formControlName="lastName" type="text" class="field-input"
                placeholder="Ex : Mensah"
                [class.input-error]="touched('lastName') && form.get('lastName')?.invalid">
              @if (touched('lastName') && form.get('lastName')?.hasError('required')) {
                <p class="field-error">Le nom est requis</p>
              }
            </div>
          </div>

          <!-- Contact -->
          <div class="section-title">Contact</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="field-group">
              <label class="field-label">Email <span class="required">*</span></label>
              <input formControlName="email" type="email" class="field-input"
                placeholder="locataire@exemple.com"
                [class.input-error]="touched('email') && form.get('email')?.invalid">
              @if (touched('email') && form.get('email')?.hasError('required')) {
                <p class="field-error">L'email est requis</p>
              }
              @if (touched('email') && form.get('email')?.hasError('email')) {
                <p class="field-error">Email invalide</p>
              }
            </div>
            <div class="field-group">
              <label class="field-label">Téléphone <span class="required">*</span></label>
              <input formControlName="phone" type="tel" class="field-input"
                placeholder="+22890000000"
                [class.input-error]="touched('phone') && form.get('phone')?.invalid">
              @if (touched('phone') && form.get('phone')?.hasError('required')) {
                <p class="field-error">Le téléphone est requis</p>
              }
              @if (touched('phone') && form.get('phone')?.hasError('pattern')) {
                <p class="field-error">Format invalide — ex : +22890330557 (8 à 15 chiffres)</p>
              }
            </div>
          </div>

          <!-- Bien -->
          <div class="section-title">Bien associé</div>
          <div class="field-group mb-6">
            <label class="field-label">Bien immobilier <span class="required">*</span></label>
            @if (loadingProps) {
              <div class="field-input flex items-center gap-2 text-gray-400 text-sm">
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Chargement des biens…
              </div>
            } @else if (properties.length === 0) {
              <div class="field-input text-gray-400 text-sm">Aucun bien disponible — ajoutez d'abord un bien.</div>
            } @else {
              <select formControlName="propertyId" class="field-input"
                (change)="onPropertyChange()"
                [class.input-error]="touched('propertyId') && form.get('propertyId')?.invalid">
                <option value="">Sélectionner un bien…</option>
                @for (p of properties; track p.id) {
                  <option [value]="p.id">{{ p.address }}, {{ p.neighborhood }} — {{ p.city }}</option>
                }
              </select>
            }
            @if (touched('propertyId') && form.get('propertyId')?.hasError('required')) {
              <p class="field-error">Veuillez sélectionner un bien</p>
            }
          </div>

          <!-- Bail -->
          <div class="section-title">Conditions du bail</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="field-group">
              <label class="field-label">Loyer mensuel (FCFA) <span class="required">*</span></label>
              <input formControlName="monthlyRent" type="number" min="1" class="field-input"
                placeholder="Ex : 75000"
                [class.input-error]="touched('monthlyRent') && form.get('monthlyRent')?.invalid">
              @if (touched('monthlyRent') && form.get('monthlyRent')?.hasError('required')) {
                <p class="field-error">Le loyer est requis</p>
              }
              @if (touched('monthlyRent') && form.get('monthlyRent')?.hasError('min')) {
                <p class="field-error">Le loyer doit être supérieur à 0</p>
              }
            </div>
            <div class="field-group">
              <label class="field-label">Charges mensuelles (FCFA) <span class="required">*</span></label>
              <input formControlName="monthlyCharges" type="number" min="0" class="field-input"
                placeholder="Ex : 5000"
                [class.input-error]="touched('monthlyCharges') && form.get('monthlyCharges')?.invalid">
              @if (touched('monthlyCharges') && form.get('monthlyCharges')?.hasError('required')) {
                <p class="field-error">Les charges sont requises (0 si aucune)</p>
              }
            </div>
            <div class="field-group">
              <label class="field-label">Fréquence de paiement <span class="required">*</span></label>
              <select formControlName="paymentFrequency" class="field-input"
                [class.input-error]="touched('paymentFrequency') && form.get('paymentFrequency')?.invalid">
                @for (freq of paymentFrequencies; track freq.value) {
                  <option [value]="freq.value">{{ freq.label }}</option>
                }
              </select>
            </div>
            <div class="field-group">
              <label class="field-label">Dépôt de garantie (FCFA) <span class="required">*</span></label>
              <input formControlName="securityDeposit" type="number" min="0" class="field-input"
                placeholder="Ex : 75000"
                [class.input-error]="touched('securityDeposit') && form.get('securityDeposit')?.invalid">
              @if (touched('securityDeposit') && form.get('securityDeposit')?.hasError('required')) {
                <p class="field-error">Le dépôt de garantie est requis (0 si aucun)</p>
              }
            </div>
            <div class="field-group">
              <label class="field-label">Date de début <span class="required">*</span></label>
              <input formControlName="startDate" type="date" class="field-input"
                [class.input-error]="touched('startDate') && form.get('startDate')?.invalid">
              @if (touched('startDate') && form.get('startDate')?.hasError('required')) {
                <p class="field-error">La date de début est requise</p>
              }
            </div>
            <div class="field-group">
              <label class="field-label">Date de fin</label>
              <input formControlName="endDate" type="date" class="field-input">
              <p class="field-hint">Laisser vide pour un bail ouvert (renouvelé automatiquement)</p>
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <button type="button" [routerLink]="basePath + '/locataires'" class="btn-secondary">Annuler</button>
            <button type="submit" class="btn-primary" [disabled]="loading || loadingProps">
              @if (loading) {
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Envoi…
              } @else {
                Envoyer l'invitation
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page-header { background: white; border-bottom: 1px solid #E5E7EB; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .page-header-left { display: flex; align-items: center; gap: 16px; }
    .page-title { font-size: 22px; font-weight: 700; color: #111827; }
    .page-sub { font-size: 13px; color: #6B7280; margin-top: 2px; }
    .form-container { max-width: 720px; margin: 32px auto; padding: 0 24px 48px; }
    .form-card { background: white; border-radius: 16px; padding: 32px; box-shadow: 0 2px 12px rgba(10,38,80,.08); border: 1px solid #E8EDF5; }
    .section-title { font-size: 13px; font-weight: 700; color: var(--color-primary); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid #E8EDF5; }
    .field-group { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 13px; font-weight: 600; color: #374151; }
    .required { color: var(--color-error); }
    .field-input { width: 100%; padding: 10px 14px; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 14px; color: #111827; background: #FAFBFF; transition: border-color .15s, box-shadow .15s; outline: none; }
    .field-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(15,76,129,.1); }
    .input-error { border-color: var(--color-error); }
    .field-error { font-size: 12px; color: var(--color-error); margin-top: 2px; }
    .field-hint { font-size: 12px; color: #9CA3AF; margin-top: 2px; }
    .btn-primary { display: inline-flex; align-items: center; gap: 8px; background: var(--color-primary); color: white; border: none; border-radius: 10px; padding: 10px 22px; font-weight: 600; font-size: 14px; cursor: pointer; transition: background .2s; }
    .btn-primary:hover:not(:disabled) { background: var(--color-primary-dark); }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-secondary { display: inline-flex; align-items: center; background: #F3F4F6; color: #374151; border: none; border-radius: 10px; padding: 10px 20px; font-weight: 600; font-size: 14px; cursor: pointer; text-decoration: none; transition: background .2s; }
    .btn-secondary:hover { background: #E5E7EB; }
    .invitation-box { background: #EFF6FF; border: 1.5px solid #BFDBFE; border-radius: 12px; padding: 16px 20px; margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
    .invitation-title { font-size: 14px; font-weight: 700; color: #1D4ED8; }
    .invitation-note { font-size: 12px; color: #3B82F6; }
    .invitation-input { width: 100%; padding: 8px 12px; border: 1px solid #BFDBFE; border-radius: 8px; font-size: 12px; color: #1E40AF; background: white; cursor: pointer; word-break: break-all; }
    .btn-copy { align-self: flex-start; padding: 6px 16px; background: #1D4ED8; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .2s; }
    .btn-copy:hover { background: #1E40AF; }
  `],
})
export class LocataireFormComponent implements OnInit {
  form: FormGroup;
  properties: PropertyItem[] = [];
  loading = false;
  loadingProps = true;
  successMessage = '';
  errorMessage = '';
  invitationUrl = '';
  basePath: string;

  constructor(
    private fb: FormBuilder,
    private locatairesService: LocatairesService,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
  ) {
    this.basePath = this.authService.getWorkspacePrefix();
    this.form = this.fb.group({
      firstName:        ['', Validators.required],
      lastName:         ['', Validators.required],
      email:            ['', [Validators.required, Validators.email]],
      phone:            ['', [Validators.required, Validators.pattern(/^\+?\d{8,15}$/)]],
      propertyId:       ['', Validators.required],
      monthlyRent:      ['', [Validators.required, Validators.min(1)]],
      monthlyCharges:   [0, [Validators.required, Validators.min(0)]],
      paymentFrequency: ['MONTHLY', Validators.required],
      securityDeposit:  [0, [Validators.required, Validators.min(0)]],
      startDate:        ['', Validators.required],
      endDate:          [''],
    });
  }

  readonly paymentFrequencies = (Object.keys(PAYMENT_FREQUENCY_LABELS) as PaymentFrequency[])
    .map((value) => ({ value, label: PAYMENT_FREQUENCY_LABELS[value] }));

  ngOnInit(): void {
    this.http.get<{ data: PropertyItem[] }>(`${environment.apiUrl}/properties`).subscribe({
      next: ({ data }) => {
        this.properties = data;
        this.loadingProps = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger la liste des biens.';
        this.loadingProps = false;
      },
    });
  }

  copied = false;

  touched(field: string): boolean {
    return !!this.form.get(field)?.touched;
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.invitationUrl).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    });
  }

  // Pré-remplit loyer/charges depuis le bien sélectionné — reste éditable,
  // évite de ressaisir des montants déjà connus (voir Bien.monthlyRent).
  onPropertyChange(): void {
    const property = this.properties.find((p) => p.id === this.form.value.propertyId);
    if (!property) return;
    this.form.patchValue({
      monthlyRent: property.monthlyRent,
      monthlyCharges: property.monthlyCharges,
    });
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMessage = '';

    const { endDate, ...rest } = this.form.value;
    const payload = endDate ? { ...rest, endDate } : rest;

    this.locatairesService.inviteLocataire(payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.successMessage = 'Locataire invité avec succès !';
        this.invitationUrl = res?.invitationUrl ?? '';
        this.form.reset();
      },
      error: (err: any) => {
        this.loading = false;
        const msg = err.error?.message;
        this.errorMessage = Array.isArray(msg)
          ? msg.join(', ')
          : (msg || "Erreur lors de l'invitation. Vérifiez les informations saisies.");
      },
    });
  }
}

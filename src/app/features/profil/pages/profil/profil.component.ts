import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { AuthService } from '../../../../core/services/auth.service';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokConfirmModalComponent } from '../../../../shared/components/lok-confirm-modal/lok-confirm-modal.component';
import { DelegationService, PowerDelegation, DelegationManager } from '../../../delegation/delegation.service';
import { LokDatePipe } from '../../../../shared/pipes/lok-date.pipe';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, LokAlerteComponent, LokSkeletonComponent, LokConfirmModalComponent, LokDatePipe],
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
            <h1 class="page-title">Mon Profil</h1>
            <p class="page-sub">Gérez vos informations personnelles</p>
          </div>
        </div>
      </div>

      <div class="p-6">
        <div class="max-w-2xl mx-auto space-y-6">

          @if (loading()) {
          <lok-skeleton type="card"></lok-skeleton>
        } @else {

          <!-- Informations personnelles -->
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h2>

            @if (successMsg()) {
              <lok-alerte type="success" [message]="successMsg()"></lok-alerte>
            }
            @if (errorMsg()) {
              <lok-alerte type="error" [message]="errorMsg()"></lok-alerte>
            }

            <!-- Photo de profil -->
            <div class="flex items-center gap-4 mb-6">
              <div class="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-2xl overflow-hidden">
                @if (photoPreview()) {
                  <img [src]="photoPreview()" alt="Photo profil" class="w-full h-full object-cover">
                } @else {
                  {{ initiales() }}
                }
              </div>
              <div>
                <label class="btn-secondary cursor-pointer text-sm">
                  <input type="file" accept="image/*" (change)="onPhoto($event)" class="hidden">
                  Changer la photo
                </label>
                <p class="text-xs text-gray-400 mt-1">JPG, PNG — max 5 Mo</p>
              </div>
            </div>

            <form [formGroup]="form" (ngSubmit)="onSave()" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input formControlName="firstName" type="text" class="input-field">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input formControlName="lastName" type="text" class="input-field">
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Rappel loyer (jours avant échéance)</label>
                <input formControlName="reminderDaysBefore" type="number" min="1" max="30" class="input-field">
                <p class="text-xs text-gray-400 mt-1">1 à 30 jours avant la date d'échéance</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Jours de grâce impayé</label>
                <input formControlName="overdueGraceDays" type="number" min="0" max="30" class="input-field">
              </div>
              <button type="submit" class="btn-primary" [disabled]="form.invalid || saving()">
                @if (saving()) { Enregistrement… } @else { Sauvegarder }
              </button>
            </form>
          </div>

          <!-- Notifications push -->
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 class="text-lg font-semibold text-gray-900 mb-1">Notifications</h2>
            <p class="text-sm text-gray-500 mb-4">Recevez des alertes sur les paiements et l'activité de vos biens</p>
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900 text-sm">Notifications push</p>
                <p class="text-xs text-gray-500">{{ pushEnabled() ? 'Activées' : 'Désactivées' }}</p>
              </div>
              <button
                [class]="pushEnabled() ? 'toggle-on' : 'toggle-off'"
                (click)="togglePush()"
                [disabled]="pushLoading()"
              >
                <span class="toggle-thumb"></span>
              </button>
            </div>
          </div>

          <!-- ── DÉLÉGATION DE POUVOIR (propriétaire uniquement) ── -->
          @if (isOwner()) {
            <div class="delegation-card">
              <div class="delegation-header">
                <div>
                  <h2 class="delegation-title">Délégation de pouvoir</h2>
                  <p class="delegation-sub">Confiez la gestion complète de votre portefeuille à un gestionnaire. Vous gardez un accès en lecture seule.</p>
                </div>
                @if (delegation()) {
                  <span class="delegation-badge delegation-badge--active">Délégation active</span>
                }
              </div>

              @if (delegMsg()) {
                <lok-alerte [type]="delegMsgType()" [message]="delegMsg()" class="block mb-4"></lok-alerte>
              }

              <!-- Délégation active -->
              @if (delegation()) {
                <div class="delegation-active-box">
                  <div class="delegation-manager-info">
                    <div class="delegation-avatar">
                      {{ delegation()!.manager.firstName.charAt(0) }}{{ delegation()!.manager.lastName.charAt(0) }}
                    </div>
                    <div>
                      <p class="delegation-manager-name">{{ delegation()!.manager.firstName }} {{ delegation()!.manager.lastName }}</p>
                      <p class="delegation-manager-email">{{ delegation()!.manager.email }}</p>
                      <p class="delegation-since">Délégué depuis le {{ delegation()!.grantedAt | lokDate }}</p>
                    </div>
                  </div>
                  <button class="delegation-revoke-btn" (click)="showRevokeModal = true" [disabled]="delegLoading()">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    Révoquer la délégation
                  </button>
                </div>
              }

              <!-- Formulaire d'attribution -->
              @if (!delegation()) {
                <div class="delegation-form">
                  <!-- Gestionnaires déjà mandatés -->
                  @if (candidates().length > 0) {
                    <div class="delegation-candidates">
                      <p class="delegation-label">Gestionnaires disponibles</p>
                      <div class="candidates-list">
                        @for (c of candidates(); track c.id) {
                          <button type="button" class="candidate-btn"
                            [class.candidate-btn--selected]="selectedManagerId() === c.id"
                            (click)="selectCandidate(c)">
                            <span class="candidate-avatar">{{ c.firstName.charAt(0) }}{{ c.lastName.charAt(0) }}</span>
                            <div>
                              <p class="candidate-name">{{ c.firstName }} {{ c.lastName }}</p>
                              <p class="candidate-email">{{ c.email }}</p>
                            </div>
                            @if (selectedManagerId() === c.id) {
                              <svg class="candidate-check" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                            }
                          </button>
                        }
                      </div>
                    </div>
                    <div class="delegation-or"><span>ou</span></div>
                  }

                  <!-- Saisie email libre -->
                  <div>
                    <p class="delegation-label">Email d'un gestionnaire</p>
                    <input type="email" [(ngModel)]="managerEmail" placeholder="gestionnaire@exemple.com"
                      class="delegation-input" (input)="selectedManagerId.set(null)">
                  </div>

                  <button class="delegation-grant-btn" (click)="grantDelegation()"
                    [disabled]="delegLoading() || (!selectedManagerId() && !managerEmail.trim())">
                    @if (delegLoading()) {
                      <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      Délégation en cours…
                    } @else {
                      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                      Déléguer mes pouvoirs
                    }
                  </button>
                </div>
              }
            </div>
          }

          <!-- Suppression de compte -->
          <div class="bg-white rounded-xl p-6 shadow-sm border border-red-100">
            <h2 class="text-lg font-semibold text-red-700 mb-1">Zone dangereuse</h2>
            <p class="text-sm text-gray-500 mb-4">La suppression est irréversible. Vos données personnelles seront anonymisées mais l'historique des baux sera conservé pour raisons légales.</p>
            <button class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
              (click)="showDeleteModal = true">
              Supprimer mon compte
            </button>
          </div>

          }
        </div>
      </div>
    </div>

    @if (showDeleteModal) {
      <lok-confirm-modal
        titre="Supprimer votre compte ?"
        message="Cette action est irréversible. Votre compte Supabase sera supprimé et vos informations personnelles anonymisées."
        confirmLabel="Supprimer définitivement"
        cancelLabel="Annuler"
        (onConfirm)="deleteAccount()"
        (onCancel)="showDeleteModal = false"
      ></lok-confirm-modal>
    }

    @if (showRevokeModal) {
      <lok-confirm-modal
        titre="Révoquer la délégation ?"
        message="Le gestionnaire sera notifié et perdra immédiatement ses droits d'action. Vous retrouvez tous vos pouvoirs."
        confirmLabel="Révoquer"
        cancelLabel="Annuler"
        (onConfirm)="revokeDelegation()"
        (onCancel)="showRevokeModal = false"
      ></lok-confirm-modal>
    }
  `,
  styles: [`
    .logo-img { height: 88px; width: auto; object-fit: contain; background: transparent !important; mix-blend-mode: multiply; }
    .page-header { background: white; border-bottom: 1px solid #E5E7EB; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .page-header-left { display: flex; align-items: center; gap: 16px; min-width: 0; }
    .page-divider { width: 1px; height: 32px; background: #E5E7EB; flex-shrink: 0; }
    .page-title { font-size: 22px; font-weight: 700; color: #111827; line-height: 1.2; white-space: nowrap; }
    .page-sub { font-size: 13px; color: #6B7280; margin-top: 1px; }
    @media (max-width: 640px) {
      .page-header { padding: 12px 16px 12px 64px; }
      .page-logo { display: none; }
      .page-divider { display: none; }
      .page-title { font-size: 18px; }
      .page-sub { display: none; }
    }
    .btn-primary { background: #0F4C81; color: white; border: none; border-radius: .625rem;
      padding: .625rem 1.25rem; font-size: .9rem; font-weight: 600; cursor: pointer; transition: background .2s; }
    .btn-primary:hover:not(:disabled) { background: #0A2650; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn-secondary { display: inline-block; border: 1.5px solid #d1d5db; border-radius: .5rem;
      padding: .5rem .875rem; font-weight: 500; color: #374151; background: white;
      cursor: pointer; transition: border-color .2s; }
    .btn-secondary:hover { border-color: #0F4C81; color: #0F4C81; }
    .toggle-on, .toggle-off { position: relative; width: 48px; height: 26px; border-radius: 13px;
      border: none; cursor: pointer; transition: background .2s; }
    .toggle-on { background: #0F4C81; }
    .toggle-off { background: #d1d5db; }
    .toggle-thumb { position: absolute; top: 3px; width: 20px; height: 20px; background: white;
      border-radius: 50%; transition: left .2s; }
    .toggle-on .toggle-thumb { left: 25px; }
    .toggle-off .toggle-thumb { left: 3px; }
    .toggle-on:disabled, .toggle-off:disabled { opacity: .6; cursor: not-allowed; }

    /* ── Délégation ── */
    .delegation-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,.08); border: 1.5px solid #e0edff; }
    .delegation-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
    .delegation-title { font-size: 1.0625rem; font-weight: 700; color: #111827; margin-bottom: .25rem; }
    .delegation-sub { font-size: .8125rem; color: #6B7280; line-height: 1.5; max-width: 42ch; }
    .delegation-badge { font-size: .75rem; font-weight: 700; padding: .3rem .75rem; border-radius: 999px; white-space: nowrap; }
    .delegation-badge--active { background: #dcfce7; color: #166534; }
    .delegation-label { font-size: .75rem; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: .04em; margin-bottom: .625rem; }

    /* Délégation active */
    .delegation-active-box { background: #F0F7FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .delegation-manager-info { display: flex; align-items: center; gap: .875rem; }
    .delegation-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--color-primary); color: white; font-weight: 700; font-size: 1rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .delegation-manager-name { font-size: .9375rem; font-weight: 700; color: #111827; }
    .delegation-manager-email { font-size: .8125rem; color: #6B7280; }
    .delegation-since { font-size: .75rem; color: #9CA3AF; margin-top: .125rem; }
    .delegation-revoke-btn { display: flex; align-items: center; gap: .5rem; padding: .5rem 1rem; border-radius: 8px; border: 1.5px solid #ef4444; background: white; color: #ef4444; font-size: .8125rem; font-weight: 600; cursor: pointer; transition: all .15s; min-height: 44px; }
    .delegation-revoke-btn:hover:not(:disabled) { background: #FEF2F2; }
    .delegation-revoke-btn:disabled { opacity: .5; cursor: not-allowed; }

    /* Formulaire */
    .delegation-form { display: flex; flex-direction: column; gap: 1rem; }
    .delegation-or { display: flex; align-items: center; gap: .75rem; }
    .delegation-or::before, .delegation-or::after { content: ''; flex: 1; height: 1px; background: #E5E7EB; }
    .delegation-or span { font-size: .8125rem; color: #9CA3AF; font-weight: 500; }
    .delegation-input { width: 100%; border: 1.5px solid #E5E7EB; border-radius: 8px; padding: .625rem .875rem; font-size: .9375rem; outline: none; transition: border-color .15s; }
    .delegation-input:focus { border-color: var(--color-primary); }

    /* Candidats */
    .candidates-list { display: flex; flex-direction: column; gap: .5rem; }
    .candidate-btn { display: flex; align-items: center; gap: .875rem; padding: .75rem 1rem; border-radius: 10px; border: 1.5px solid #E5E7EB; background: #FAFAFA; cursor: pointer; transition: all .15s; text-align: left; width: 100%; min-height: 44px; }
    .candidate-btn:hover { border-color: var(--color-primary); background: #F0F7FF; }
    .candidate-btn--selected { border-color: var(--color-primary) !important; background: #EEF4FC !important; }
    .candidate-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--color-primary); color: white; font-weight: 700; font-size: .875rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .candidate-name { font-size: .875rem; font-weight: 600; color: #111827; }
    .candidate-email { font-size: .75rem; color: #6B7280; }
    .candidate-check { margin-left: auto; color: var(--color-primary); flex-shrink: 0; }

    /* Bouton accorder */
    .delegation-grant-btn { display: flex; align-items: center; gap: .625rem; justify-content: center; padding: .75rem 1.5rem; border-radius: 10px; border: none; background: var(--color-primary); color: white; font-size: .9375rem; font-weight: 600; cursor: pointer; transition: background .15s; min-height: 44px; }
    .delegation-grant-btn:hover:not(:disabled) { background: var(--color-primary-dark); }
    .delegation-grant-btn:disabled { opacity: .5; cursor: not-allowed; }
  `],
})
export class ProfilComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  successMsg = signal('');
  errorMsg = signal('');
  pushEnabled = signal(false);
  pushLoading = signal(false);
  photoPreview = signal<string | null>(null);
  showDeleteModal = false;

  // Délégation
  delegation = signal<PowerDelegation | null>(null);
  candidates = signal<DelegationManager[]>([]);
  selectedManagerId = signal<string | null>(null);
  managerEmail = '';
  delegLoading = signal(false);
  delegMsg = signal('');
  delegMsgType = signal<'success' | 'error'>('success');
  showRevokeModal = false;

  form: FormGroup;
  private photoFile: File | null = null;
  private readonly profileUrl = `${environment.apiUrl}/profile`;
  private readonly pushUrl = `${environment.apiUrl}/push`;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private authService: AuthService,
    private delegationService: DelegationService,
  ) {
    this.form = this.fb.group({
      firstName:           ['', Validators.required],
      lastName:            ['', Validators.required],
      reminderDaysBefore:  [7, [Validators.min(1), Validators.max(30)]],
      overdueGraceDays:    [3, [Validators.min(0), Validators.max(30)]],
    });
  }

  isOwner(): boolean {
    return this.authService.getCurrentUser()?.role === 'OWNER';
  }

  ngOnInit(): void {
    if (this.isOwner()) {
      this.delegationService.loadStatus().subscribe(d => this.delegation.set(d));
      this.delegationService.getCandidates().subscribe(c => this.candidates.set(c));
    }

    this.http.get<any>(this.profileUrl).subscribe({
      next: (p) => {
        this.form.patchValue({
          firstName:          p.firstName ?? '',
          lastName:           p.lastName ?? '',
          reminderDaysBefore: p.profile?.reminderDaysBefore ?? 7,
          overdueGraceDays:   p.profile?.overdueGraceDays ?? 3,
        });
        if (p.profile?.profilePhotoUrl) this.photoPreview.set(p.profile.profilePhotoUrl);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); },
    });
  }

  initiales(): string {
    const u = this.authService.getCurrentUser();
    return `${u?.firstName?.charAt(0) ?? ''}${u?.lastName?.charAt(0) ?? ''}`;
  }

  onPhoto(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.photoFile = file;
    const reader = new FileReader();
    reader.onload = (e) => this.photoPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  onSave(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.successMsg.set('');
    this.errorMsg.set('');

    const fd = new FormData();
    const v = this.form.value;
    fd.append('firstName', v.firstName);
    fd.append('lastName', v.lastName);
    fd.append('reminderDaysBefore', String(v.reminderDaysBefore));
    fd.append('overdueGraceDays', String(v.overdueGraceDays));
    if (this.photoFile) fd.append('photo', this.photoFile);

    this.http.patch<any>(this.profileUrl, fd).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMsg.set('Profil mis à jour avec succès.');
        this.authService.loadProfile().subscribe();
      },
      error: (err: any) => {
        this.saving.set(false);
        this.errorMsg.set(err.error?.message || 'Erreur lors de la mise à jour.');
      },
    });
  }

  togglePush(): void {
    if (this.pushLoading()) return;
    this.pushLoading.set(true);
    const newConsent = this.pushEnabled() ? 'DECLINED' : 'ACCEPTED';
    this.http.patch(`${this.profileUrl}/notification-consent`, { consent: newConsent }).subscribe({
      next: () => {
        this.pushEnabled.set(!this.pushEnabled());
        this.pushLoading.set(false);
      },
      error: () => { this.pushLoading.set(false); },
    });
  }

  deleteAccount(): void {
    this.showDeleteModal = false;
    this.http.delete(this.profileUrl).subscribe({
      next: () => { this.authService.logout(); },
      error: (err: any) => {
        this.errorMsg.set(err.error?.message || 'Erreur lors de la suppression du compte.');
      },
    });
  }

  selectCandidate(c: DelegationManager): void {
    this.selectedManagerId.set(c.id);
    this.managerEmail = '';
  }

  grantDelegation(): void {
    this.delegLoading.set(true);
    this.delegMsg.set('');
    const payload = this.selectedManagerId()
      ? { managerId: this.selectedManagerId()! }
      : { managerEmail: this.managerEmail.trim() };

    this.delegationService.grant(payload).subscribe({
      next: (d) => {
        this.delegation.set(d);
        this.delegLoading.set(false);
        this.delegMsgType.set('success');
        this.delegMsg.set('Délégation accordée avec succès. Le gestionnaire a été notifié.');
        setTimeout(() => this.delegMsg.set(''), 4000);
      },
      error: (err: any) => {
        this.delegLoading.set(false);
        this.delegMsgType.set('error');
        this.delegMsg.set(err.error?.message || 'Erreur lors de la délégation.');
      },
    });
  }

  revokeDelegation(): void {
    this.showRevokeModal = false;
    this.delegLoading.set(true);
    this.delegationService.revoke().subscribe({
      next: () => {
        this.delegation.set(null);
        this.selectedManagerId.set(null);
        this.managerEmail = '';
        this.delegLoading.set(false);
        this.delegMsgType.set('success');
        this.delegMsg.set('Délégation révoquée. Vous avez retrouvé tous vos droits.');
        setTimeout(() => this.delegMsg.set(''), 4000);
      },
      error: (err: any) => {
        this.delegLoading.set(false);
        this.delegMsgType.set('error');
        this.delegMsg.set(err.error?.message || 'Erreur lors de la révocation.');
      },
    });
  }
}

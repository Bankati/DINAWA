import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { AuthService } from '../../../../core/services/auth.service';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokConfirmModalComponent } from '../../../../shared/components/lok-confirm-modal/lok-confirm-modal.component';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LokAlerteComponent, LokSkeletonComponent, LokConfirmModalComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-2xl mx-auto space-y-6">

        <div>
          <h1 class="text-2xl font-bold text-gray-900">Mon profil</h1>
          <p class="text-gray-600 text-sm mt-1">Gérez vos informations personnelles et préférences</p>
        </div>

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

    @if (showDeleteModal) {
      <lok-confirm-modal
        titre="Supprimer votre compte ?"
        message="Cette action est irréversible. Votre compte Supabase sera supprimé et vos informations personnelles anonymisées."
        confirmLabel="Supprimer définitivement"
        cancelLabel="Annuler"
        (confirm)="deleteAccount()"
        (cancel)="showDeleteModal = false"
      ></lok-confirm-modal>
    }
  `,
  styles: [`
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

  form: FormGroup;
  private photoFile: File | null = null;
  private readonly profileUrl = `${environment.apiUrl}/profile`;
  private readonly pushUrl = `${environment.apiUrl}/push`;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private authService: AuthService,
  ) {
    this.form = this.fb.group({
      firstName:           ['', Validators.required],
      lastName:            ['', Validators.required],
      reminderDaysBefore:  [7, [Validators.min(1), Validators.max(30)]],
      overdueGraceDays:    [3, [Validators.min(0), Validators.max(30)]],
    });
  }

  ngOnInit(): void {
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
}

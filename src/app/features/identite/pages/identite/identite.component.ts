import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';

type CniStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

interface IdentityVerification {
  id: string;
  status: CniStatus;
  createdAt: string;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
}

@Component({
  selector: 'app-identite',
  standalone: true,
  imports: [CommonModule, LokAlerteComponent, LokSkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Vérification d'identité</h1>
          <p class="text-gray-600 text-sm mt-1">Statut de votre pièce d'identité (CNI)</p>
        </div>

        @if (loading()) {
          <lok-skeleton type="card"></lok-skeleton>
        } @else {
          <!-- Statut actuel -->
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <div class="flex items-center gap-4">
              <!-- Icône statut -->
              <div [class]="iconWrap()">
                @if (status() === 'VERIFIED') {
                  <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                } @else if (status() === 'PENDING') {
                  <svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                } @else if (status() === 'REJECTED') {
                  <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M15 9l-6 6M9 9l6 6"/>
                  </svg>
                } @else {
                  <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <rect x="2" y="5" width="20" height="14" rx="2"/>
                    <circle cx="9" cy="12" r="2.5"/>
                    <path d="M14 10h4M14 14h3"/>
                  </svg>
                }
              </div>
              <div>
                <p class="font-semibold text-gray-900 text-lg">{{ statusLabel() }}</p>
                @if (verification?.createdAt) {
                  <p class="text-sm text-gray-500">Soumis le {{ verification!.createdAt | date:'dd/MM/yyyy' }}</p>
                }
              </div>
            </div>

            @if (status() === 'REJECTED' && verification?.rejectionReason) {
              <div class="mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                <strong>Motif de rejet :</strong> {{ verification!.rejectionReason }}
              </div>
            }

            @if (status() === 'PENDING') {
              <div class="mt-4 p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
                La vérification prend généralement moins de 24h ouvrées. Vous recevrez une notification par email.
              </div>
            }
          </div>

          <!-- Upload nouvelle CNI (si rejeté ou pas encore soumis) -->
          @if (status() !== 'VERIFIED') {
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 class="text-lg font-semibold text-gray-900 mb-1">
                {{ status() === 'REJECTED' ? 'Soumettre une nouvelle pièce' : 'Soumettre votre pièce d\'identité' }}
              </h2>
              <p class="text-sm text-gray-500 mb-4">CNI en cours de validité — recto et verso (JPG/PNG/WebP, max 5 Mo chacun)</p>

              @if (uploadError()) {
                <lok-alerte type="error" [message]="uploadError()"></lok-alerte>
              }
              @if (uploadSuccess()) {
                <lok-alerte type="success" message="CNI soumise avec succès. La vérification est en cours."></lok-alerte>
              }

              <div class="grid grid-cols-2 gap-4 mb-4">
                <!-- Recto -->
                <div class="upload-zone" [class.has-file]="cniRecto" (click)="rectoInput.click()">
                  <input #rectoInput type="file" accept="image/jpeg,image/png,image/webp" (change)="onFile($event,'recto')" class="hidden">
                  @if (cniRecto) {
                    <svg class="w-7 h-7 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                    <span class="text-xs text-gray-700 mt-1 truncate max-w-full px-2">{{ cniRecto.name }}</span>
                  } @else {
                    <svg class="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    <span class="font-medium text-sm text-gray-700">CNI Recto</span>
                    <span class="text-xs text-gray-400">Cliquer pour choisir</span>
                  }
                </div>
                <!-- Verso -->
                <div class="upload-zone" [class.has-file]="cniVerso" (click)="versoInput.click()">
                  <input #versoInput type="file" accept="image/jpeg,image/png,image/webp" (change)="onFile($event,'verso')" class="hidden">
                  @if (cniVerso) {
                    <svg class="w-7 h-7 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                    <span class="text-xs text-gray-700 mt-1 truncate max-w-full px-2">{{ cniVerso.name }}</span>
                  } @else {
                    <svg class="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    <span class="font-medium text-sm text-gray-700">CNI Verso</span>
                    <span class="text-xs text-gray-400">Cliquer pour choisir</span>
                  }
                </div>
              </div>

              <button class="btn-primary w-full" [disabled]="!cniRecto || !cniVerso || uploading()" (click)="submitCni()">
                @if (uploading()) { Envoi en cours… } @else { Soumettre la vérification }
              </button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .upload-zone {
      border: 2px dashed #d1d5db; border-radius: .75rem; padding: 1.25rem 1rem;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: .375rem; cursor: pointer; transition: all .2s; text-align: center; min-height: 120px;
    }
    .upload-zone:hover { border-color: #0F4C81; background: #f0f7ff; }
    .upload-zone.has-file { border-color: #10b981; background: #f0fdf4; border-style: solid; }
    .btn-primary { background: #0F4C81; color: white; border: none; border-radius: .625rem;
      padding: .75rem 1.5rem; font-size: .95rem; font-weight: 600; cursor: pointer; transition: background .2s; }
    .btn-primary:hover:not(:disabled) { background: #0A2650; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
  `],
})
export class IdentiteComponent implements OnInit {
  loading = signal(true);
  uploading = signal(false);
  uploadError = signal('');
  uploadSuccess = signal(false);
  status = signal<CniStatus | null>(null);
  verification: IdentityVerification | null = null;

  cniRecto: File | null = null;
  cniVerso: File | null = null;

  private readonly apiUrl = `${environment.apiUrl}/identity`;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<IdentityVerification | null>(`${this.apiUrl}/status`).subscribe({
      next: (v) => {
        this.verification = v;
        this.status.set(v?.status ?? null);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); },
    });
  }

  onFile(event: Event, side: 'recto' | 'verso'): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (side === 'recto') this.cniRecto = file;
    else this.cniVerso = file;
  }

  submitCni(): void {
    if (!this.cniRecto || !this.cniVerso) return;
    this.uploading.set(true);
    this.uploadError.set('');
    this.uploadSuccess.set(false);

    const fd = new FormData();
    fd.append('image', this.cniRecto);
    fd.append('imageBack', this.cniVerso);

    this.http.post<IdentityVerification>(`${this.apiUrl}/verify`, fd).subscribe({
      next: (v) => {
        this.verification = v;
        this.status.set('PENDING');
        this.uploading.set(false);
        this.uploadSuccess.set(true);
        this.cniRecto = null;
        this.cniVerso = null;
      },
      error: (err: any) => {
        this.uploading.set(false);
        this.uploadError.set(err.error?.message || 'Erreur lors de l\'envoi. Réessayez.');
      },
    });
  }

  statusLabel(): string {
    switch (this.status()) {
      case 'VERIFIED': return 'Identité vérifiée';
      case 'PENDING':  return 'Vérification en cours';
      case 'REJECTED': return 'Vérification rejetée';
      default:         return 'Aucune vérification soumise';
    }
  }

  iconWrap(): string {
    switch (this.status()) {
      case 'VERIFIED': return 'w-16 h-16 bg-green-100 rounded-full flex items-center justify-center';
      case 'PENDING':  return 'w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center';
      case 'REJECTED': return 'w-16 h-16 bg-red-100 rounded-full flex items-center justify-center';
      default:         return 'w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center';
    }
  }
}

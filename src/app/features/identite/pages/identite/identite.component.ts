import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokDatePipe } from '../../../../shared/pipes/lok-date.pipe';

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
  imports: [CommonModule, LokAlerteComponent, LokSkeletonComponent, LokDatePipe],
  template: `
    <div class="min-h-screen" style="background:#F0F4FA">

      <!-- ── EN-TÊTE ── -->
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-logo">
            <img src="/assets/WARAH-logo.png" alt="WARAH" class="logo-img">
          </div>
          <div class="page-divider"></div>
          <div>
            <h1 class="page-title">Vérification CNI</h1>
            <p class="page-sub">Confirmez votre identité pour accéder à toutes les fonctionnalités</p>
          </div>
        </div>
        <!-- Badge statut global -->
        <span class="status-pill" [class]="statusPillClass()">
          <span class="status-dot"></span>
          {{ statusLabel() }}
        </span>
      </div>

      <!-- ── KPI ── -->
      <div class="kpi-grid">
        <!-- Statut -->
        <div class="kpi-card">
          <p class="kpi-label">Statut</p>
          <div class="kpi-status">
            <div class="kpi-status-icon" [class]="statusIconClass()">
              @if (status() === 'VERIFIED') {
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
              } @else if (status() === 'PENDING') {
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              } @else if (status() === 'REJECTED') {
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
              } @else {
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8.5" cy="12" r="2.5"/><path d="M13.5 9.5h5M13.5 12.5h4"/></svg>
              }
            </div>
            <p class="kpi-status-text" [class]="statusTextClass()">{{ statusLabel() }}</p>
          </div>
        </div>

        <!-- Documents -->
        <div class="kpi-card">
          <p class="kpi-label">Documents</p>
          <p class="kpi-val" [style]="docCount() === 2 ? 'color:#16a34a' : 'color:#111827'">
            {{ docCount() }}<span class="kpi-val-sub">/2</span>
          </p>
        </div>

        <!-- Soumis le -->
        <div class="kpi-card">
          <p class="kpi-label">Soumis le</p>
          @if (verification?.createdAt) {
            <p class="kpi-date">{{ verification!.createdAt | lokDate }}</p>
          } @else {
            <p class="kpi-val" style="color:#9CA3AF">—</p>
          }
        </div>

        <!-- Délai -->
        <div class="kpi-card">
          <p class="kpi-label">Délai traitement</p>
          @if (status() === 'VERIFIED') {
            <p class="kpi-date" style="color:#16a34a">Complété</p>
          } @else if (status() === 'PENDING') {
            <p class="kpi-date" style="color:#d97706">24h ouvrées</p>
          } @else if (status() === 'REJECTED') {
            <p class="kpi-date" style="color:#dc2626">À renouveler</p>
          } @else {
            <p class="kpi-val" style="color:#9CA3AF">—</p>
          }
        </div>
      </div>

      <!-- ── CONTENU ── -->
      <div class="content-area">

        @if (loading()) {
          <lok-skeleton type="card"></lok-skeleton>
          <lok-skeleton type="card"></lok-skeleton>

        } @else {

          <!-- Bandeau statut (pleine largeur) -->
          <div class="status-banner" [class]="statusBannerClass()">
            <div class="status-banner-icon" [class]="statusBannerIconClass()">
              @if (status() === 'VERIFIED') {
                <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
              } @else if (status() === 'PENDING') {
                <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              } @else if (status() === 'REJECTED') {
                <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
              } @else {
                <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              }
            </div>
            <div>
              <p class="status-banner-title">
                @if (status() === 'VERIFIED') { Votre identité est confirmée }
                @else if (status() === 'PENDING') { Vérification en cours — traitement sous 24h ouvrées }
                @else if (status() === 'REJECTED') { Document rejeté — soumettez une nouvelle pièce }
                @else { Aucune vérification soumise pour l'instant }
              </p>
              <p class="status-banner-sub">
                @if (status() === 'VERIFIED') { Vous avez accès à toutes les fonctionnalités de la plateforme WARAH. }
                @else if (status() === 'PENDING') { Un email de confirmation vous sera envoyé dès que la vérification sera terminée. }
                @else if (status() === 'REJECTED') { {{ verification?.rejectionReason || 'Veuillez soumettre un nouveau document lisible et valide.' }} }
                @else { Soumettez votre carte nationale d'identité recto + verso pour vérifier votre compte. }
              </p>
            </div>
          </div>

          <!-- Alertes -->
          @if (uploadError()) { <lok-alerte type="error" [message]="uploadError()" class="block"></lok-alerte> }
          @if (uploadSuccess()) { <lok-alerte type="success" message="Votre CNI a été soumise avec succès. Traitement en cours." class="block"></lok-alerte> }

          <!-- Formulaire upload (masqué si VERIFIED) -->
          @if (status() !== 'VERIFIED') {
            <div class="upload-card">

              <!-- En-tête du formulaire -->
              <div class="upload-header">
                <div>
                  <p class="upload-title">{{ uploadTitle() }}</p>
                  <p class="upload-sub">JPG · PNG · WebP · max 5 Mo par photo</p>
                </div>
                <span class="doc-counter" [class.doc-counter-done]="docCount() === 2">
                  {{ docCount() }}/2 document{{ docCount() !== 1 ? 's' : '' }}
                </span>
              </div>

              <!-- Barre de progression -->
              <div class="progress-wrap">
                <div class="progress-bar" [style.width]="docCount() * 50 + '%'"></div>
              </div>

              <!-- Zones upload -->
              <div class="upload-zones">

                <!-- RECTO -->
                <input #rectoInput type="file" accept="image/jpeg,image/png,image/webp" (change)="onFile($event,'recto')" class="hidden">
                <button type="button" class="id-zone" [class.id-zone-done]="!!cniRecto" (click)="rectoInput.click()">
                  <!-- Illustration CNI recto -->
                  <div class="cni-card-recto" [class.cni-card-done]="!!cniRecto">
                    <div class="cni-flag">
                      <span style="background:#009a00"></span>
                      <span style="background:#ffce00"></span>
                      <span style="background:#ce1126"></span>
                    </div>
                    <div class="cni-body">
                      <div class="cni-photo-box"></div>
                      <div class="cni-text-lines">
                        <div class="cni-tl" style="width:100%"></div>
                        <div class="cni-tl" style="width:72%"></div>
                        <div class="cni-tl" style="width:50%"></div>
                      </div>
                    </div>
                    <div class="cni-footer-bar"></div>
                  </div>
                  @if (cniRecto) {
                    <div class="id-ok">✓</div>
                    <p class="id-label id-label-ok">Recto ajouté</p>
                  } @else {
                    <p class="id-label">Face avant (recto)</p>
                    <p class="id-sublabel">Cliquer pour sélectionner</p>
                  }
                </button>

                <!-- VERSO -->
                <input #versoInput type="file" accept="image/jpeg,image/png,image/webp" (change)="onFile($event,'verso')" class="hidden">
                <button type="button" class="id-zone" [class.id-zone-done]="!!cniVerso" (click)="versoInput.click()">
                  <!-- Illustration CNI verso -->
                  <div class="cni-card-verso" [class.cni-card-done]="!!cniVerso">
                    <div class="cni-magstrip"></div>
                    <div class="cni-chip-area">
                      <div class="cni-chip-box"></div>
                      <div class="cni-sig-lines">
                        <div class="cni-tl" style="width:100%;background:rgba(255,255,255,.25)"></div>
                        <div class="cni-tl" style="width:80%;background:rgba(255,255,255,.25)"></div>
                      </div>
                    </div>
                    <div class="cni-mrz-area">
                      <div class="cni-mrz-l"></div>
                      <div class="cni-mrz-l"></div>
                    </div>
                  </div>
                  @if (cniVerso) {
                    <div class="id-ok">✓</div>
                    <p class="id-label id-label-ok">Verso ajouté</p>
                  } @else {
                    <p class="id-label">Face arrière (verso)</p>
                    <p class="id-sublabel">Cliquer pour sélectionner</p>
                  }
                </button>
              </div>

              <!-- Bouton submit -->
              <div class="upload-footer">
                <button type="button"
                  [disabled]="!cniRecto || !cniVerso || uploading()"
                  (click)="submitCni()"
                  class="submit-btn"
                  [class.submit-btn-active]="cniRecto && cniVerso && !uploading()"
                  [class.submit-btn-disabled]="!cniRecto || !cniVerso || uploading()">
                  @if (uploading()) {
                    <svg class="spin-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                    Envoi en cours…
                  } @else if (cniRecto && cniVerso) {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg>
                    Soumettre la vérification
                  } @else {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8.5" cy="12" r="2.5"/><path d="M13.5 9.5h5"/></svg>
                    Ajoutez recto + verso pour continuer
                  }
                </button>
                <p class="security-note">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;flex-shrink:0"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Données chiffrées — traitement sécurisé WARAH
                </p>
              </div>

            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    /* ── En-tête ── */
    .logo-img { height: 88px; width: auto; object-fit: contain; mix-blend-mode: multiply; }
    .page-header { background: white; border-bottom: 1px solid #E5E7EB; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .page-header-left { display: flex; align-items: center; gap: 16px; min-width: 0; }
    .page-divider { width: 1px; height: 32px; background: #E5E7EB; flex-shrink: 0; }
    .page-title { font-size: 22px; font-weight: 700; color: #111827; line-height: 1.2; white-space: nowrap; }
    .page-sub { font-size: 13px; color: #6B7280; margin-top: 1px; }

    /* Pill statut dans le header */
    .status-pill { display: inline-flex; align-items: center; gap: 7px; padding: 7px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; flex-shrink: 0; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .pill-verified { background: #D1FAE5; color: #065f46; }
    .pill-verified .status-dot { background: #16a34a; }
    .pill-pending { background: #FEF3C7; color: #92400e; }
    .pill-pending .status-dot { background: #d97706; animation: pulse 1.5s ease-in-out infinite; }
    .pill-rejected { background: #FFE4E6; color: #991b1b; }
    .pill-rejected .status-dot { background: #dc2626; }
    .pill-none { background: #EEF2F9; color: #374151; }
    .pill-none .status-dot { background: #9CA3AF; }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }

    /* ── KPI ── */
    .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; padding: 32px 24px 24px; }
    .kpi-card { background: #fff; border-radius: 14px; padding: 20px 24px; box-shadow: 0 2px 12px rgba(10,38,80,.08); border: 1px solid #E8EDF5; }
    .kpi-label { font-size: 13px; color: #6B7280; margin-bottom: 10px; font-weight: 500; }
    .kpi-val { font-size: 2.25rem; font-weight: 800; line-height: 1; }
    .kpi-val-sub { font-size: 1.2rem; font-weight: 500; color: #9CA3AF; }
    .kpi-date { font-size: 1.1rem; font-weight: 700; color: #111827; line-height: 1.3; }

    /* Statut dans KPI */
    .kpi-status { display: flex; align-items: center; gap: 10px; }
    .kpi-status-icon { width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .kpi-status-text { font-size: 14px; font-weight: 700; line-height: 1.3; }
    .icon-verified { background: rgba(22,163,74,.12); color: #16a34a; }
    .icon-pending  { background: rgba(217,119,6,.12); color: #d97706; }
    .icon-rejected { background: rgba(220,38,38,.12); color: #dc2626; }
    .icon-none     { background: rgba(15,76,129,.1); color: #0F4C81; }
    .text-verified { color: #16a34a; }
    .text-pending  { color: #d97706; }
    .text-rejected { color: #dc2626; }
    .text-none     { color: #0F4C81; }

    /* ── Zone contenu ── */
    .content-area { padding: 0 24px 32px; display: flex; flex-direction: column; gap: 16px; }

    /* ── Bandeau statut ── */
    .status-banner { display: flex; align-items: flex-start; gap: 14px; border-radius: 14px; padding: 18px 20px; border: 1px solid; }
    .banner-verified { background: #F0FDF4; border-color: #BBF7D0; }
    .banner-pending  { background: #FFFBEB; border-color: #FDE68A; }
    .banner-rejected { background: #FFF1F2; border-color: #FECDD3; }
    .banner-none     { background: #EEF4FF; border-color: #BFDBFE; }

    .status-banner-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .banner-icon-verified { background: rgba(22,163,74,.15); color: #16a34a; }
    .banner-icon-pending  { background: rgba(217,119,6,.15); color: #d97706; }
    .banner-icon-rejected { background: rgba(220,38,38,.15); color: #dc2626; }
    .banner-icon-none     { background: rgba(15,76,129,.1); color: #0F4C81; }

    .status-banner-title { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .status-banner-sub { font-size: 13px; color: #6B7280; line-height: 1.5; }

    /* ── Card upload ── */
    .upload-card { background: white; border-radius: 16px; border: 1px solid #E8EDF5; box-shadow: 0 2px 12px rgba(10,38,80,.07); overflow: hidden; }

    .upload-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 20px 24px 0; }
    .upload-title { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 3px; }
    .upload-sub { font-size: 12px; color: #9CA3AF; }

    .doc-counter { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; background: #EEF2F9; color: #0F4C81; white-space: nowrap; flex-shrink: 0; }
    .doc-counter.doc-counter-done { background: #D1FAE5; color: #065f46; }

    /* Barre de progression */
    .progress-wrap { height: 4px; background: #F0F4FA; margin: 14px 24px 20px; border-radius: 999px; overflow: hidden; }
    .progress-bar { height: 100%; background: linear-gradient(90deg, #0F4C81, #C9982E); border-radius: 999px; transition: width .5s ease; }

    /* ── Zones upload ── */
    .upload-zones { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 0 24px; }

    .id-zone {
      position: relative; border: 2px dashed #D1D5DB; border-radius: 16px;
      padding: 20px 14px 16px; background: #FAFBFF; cursor: pointer;
      transition: all .22s; display: flex; flex-direction: column;
      align-items: center; min-height: 220px; width: 100%; text-align: center;
    }
    .id-zone:hover { border-color: #0F4C81; background: #EEF4FF; transform: translateY(-3px); box-shadow: 0 10px 28px rgba(15,76,129,.13); }
    .id-zone.id-zone-done { border: 2px solid #16a34a; background: #F0FDF4; }

    .id-ok { position: absolute; top: 10px; right: 10px; width: 26px; height: 26px; border-radius: 50%; background: #16a34a; color: #fff; font-size: 13px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
    .id-label { font-size: 12px; font-weight: 700; color: #374151; margin-top: 12px; }
    .id-sublabel { font-size: 11px; color: #9ca3af; margin-top: 3px; }
    .id-label-ok { color: #16a34a !important; }

    /* ── Illustrations CNI ── */
    .cni-card-recto {
      width: 148px; height: 94px; border-radius: 10px; overflow: hidden;
      background: linear-gradient(135deg,#0A2650 0%,#0F4C81 55%,#1565a8 100%);
      transition: box-shadow .2s; flex-shrink: 0;
    }
    .cni-card-recto.cni-card-done { box-shadow: 0 0 0 3px rgba(22,163,74,.4); }
    .cni-flag { display: flex; height: 9px; }
    .cni-flag span { flex: 1; }
    .cni-body { display: flex; gap: 7px; padding: 8px 8px 4px; }
    .cni-photo-box { width: 30px; height: 38px; border-radius: 4px; background: rgba(255,255,255,.22); flex-shrink: 0; }
    .cni-text-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; padding-top: 4px; }
    .cni-tl { height: 5px; border-radius: 3px; background: rgba(255,255,255,.38); }
    .cni-footer-bar { height: 6px; background: rgba(201,152,46,.35); margin-top: auto; }

    .cni-card-verso {
      width: 148px; height: 94px; border-radius: 10px; overflow: hidden;
      background: linear-gradient(145deg,#1f2937 0%,#374151 100%);
      transition: box-shadow .2s; flex-shrink: 0;
    }
    .cni-card-verso.cni-card-done { box-shadow: 0 0 0 3px rgba(22,163,74,.4); }
    .cni-magstrip { height: 20px; background: #111827; margin-top: 12px; }
    .cni-chip-area { display: flex; align-items: center; gap: 8px; padding: 6px 8px; }
    .cni-chip-box { width: 22px; height: 17px; border-radius: 3px; background: rgba(201,152,46,.55); flex-shrink: 0; }
    .cni-sig-lines { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .cni-mrz-area { padding: 4px 6px; display: flex; flex-direction: column; gap: 3px; }
    .cni-mrz-l { height: 5px; background: rgba(255,255,255,.16); border-radius: 2px; }

    /* ── Footer + bouton submit ── */
    .upload-footer { padding: 20px 24px 24px; }

    .submit-btn {
      width: 100%; height: 50px; border-radius: 12px; border: none;
      font-size: 15px; font-weight: 700; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      transition: all .2s;
    }
    .submit-btn-active { background: #0F4C81; color: white; box-shadow: 0 6px 24px rgba(15,76,129,.28); }
    .submit-btn-active:hover { background: #0A2650; box-shadow: 0 8px 32px rgba(15,76,129,.36); }
    .submit-btn-disabled { background: #F3F4F6; color: #9CA3AF; cursor: not-allowed; }

    .spin-ico { width: 16px; height: 16px; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .security-note { display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 12px; color: #9CA3AF; margin-top: 12px; }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .kpi-grid { grid-template-columns: repeat(2,1fr); gap: 12px; padding: 20px 16px 16px; }
      .content-area { padding: 0 16px 24px; }
      .upload-zones { grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 16px; }
      .upload-header { padding: 16px 16px 0; }
      .progress-wrap { margin: 12px 16px 16px; }
      .upload-footer { padding: 16px; }
    }
    @media (max-width: 640px) {
      .page-header { padding: 12px 16px 12px 64px; }
      .page-logo { display: none; }
      .page-divider { display: none; }
      .page-title { font-size: 18px; }
      .page-sub { display: none; }
      .status-pill { font-size: 12px; padding: 6px 10px; }
      .upload-zones { grid-template-columns: 1fr; }
    }
  `]
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
      error: () => { this.loading.set(false); }
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
        this.uploadError.set(err.error?.message || "Erreur lors de l'envoi. Veuillez réessayer.");
      }
    });
  }

  docCount(): number {
    return (this.cniRecto ? 1 : 0) + (this.cniVerso ? 1 : 0);
  }

  statusLabel(): string {
    switch (this.status()) {
      case 'VERIFIED': return 'Identité vérifiée';
      case 'PENDING':  return 'En cours de vérification';
      case 'REJECTED': return 'Document rejeté';
      default:         return 'Non soumis';
    }
  }

  statusPillClass(): string {
    switch (this.status()) {
      case 'VERIFIED': return 'pill-verified';
      case 'PENDING':  return 'pill-pending';
      case 'REJECTED': return 'pill-rejected';
      default:         return 'pill-none';
    }
  }

  statusIconClass(): string {
    switch (this.status()) {
      case 'VERIFIED': return 'kpi-status-icon icon-verified';
      case 'PENDING':  return 'kpi-status-icon icon-pending';
      case 'REJECTED': return 'kpi-status-icon icon-rejected';
      default:         return 'kpi-status-icon icon-none';
    }
  }

  statusTextClass(): string {
    switch (this.status()) {
      case 'VERIFIED': return 'kpi-status-text text-verified';
      case 'PENDING':  return 'kpi-status-text text-pending';
      case 'REJECTED': return 'kpi-status-text text-rejected';
      default:         return 'kpi-status-text text-none';
    }
  }

  statusBannerClass(): string {
    switch (this.status()) {
      case 'VERIFIED': return 'status-banner banner-verified';
      case 'PENDING':  return 'status-banner banner-pending';
      case 'REJECTED': return 'status-banner banner-rejected';
      default:         return 'status-banner banner-none';
    }
  }

  statusBannerIconClass(): string {
    switch (this.status()) {
      case 'VERIFIED': return 'status-banner-icon banner-icon-verified';
      case 'PENDING':  return 'status-banner-icon banner-icon-pending';
      case 'REJECTED': return 'status-banner-icon banner-icon-rejected';
      default:         return 'status-banner-icon banner-icon-none';
    }
  }

  uploadTitle(): string {
    return this.status() === 'REJECTED' ? "Nouvelle pièce d'identité" : "Soumettre votre CNI";
  }
}

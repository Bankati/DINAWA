import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { Litige, StatutLitige, PrioriteLitige } from '@core/models/admin.model';
import { LokBadgeStatutLitigeComponent } from '../../../../shared/components/lok-badge-statut-litige/lok-badge-statut-litige.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';

@Component({
  selector: 'app-litiges',
  standalone: true,
  imports: [CommonModule, FormsModule, LokBadgeStatutLitigeComponent, LokSkeletonComponent, LokEmptyStateComponent],
  template: `
    <div class="admin-page">
      <div class="admin-header">
        <h1 class="admin-title">Gestion des litiges</h1>
        <p class="admin-subtitle">Différends signalés entre propriétaires, gestionnaires et locataires</p>
      </div>

      @if (loading) {
        <lok-skeleton type="card" [count]="3"></lok-skeleton>
      } @else if (litiges.length === 0) {
        <lok-empty-state
          titre="Aucun litige"
          description="Aucun litige n'a été signalé sur la plateforme."
          icon="default"
        ></lok-empty-state>
      } @else {
        <div class="litiges-list">
          @for (litige of litiges; track litige.id) {
            <div class="litige-card">
              <div class="litige-header">
                <div>
                  <h2 class="litige-sujet">{{ litige.sujet }}</h2>
                  <div class="litige-meta">
                    <span class="priorite-pill" [class]="prioriteClasses(litige.priorite)">{{ labelPriorite(litige.priorite) }}</span>
                    <span class="litige-date">Ouvert le {{ litige.dateOuverture }}</span>
                  </div>
                </div>
                <lok-badge-statut-litige [statut]="litige.statut"></lok-badge-statut-litige>
              </div>

              <p class="litige-description">{{ litige.description }}</p>

              <div class="litige-parties">
                <span><strong>Plaignant :</strong> {{ litige.plaignant }}</span>
                <span><strong>Mis en cause :</strong> {{ litige.misEnCause }}</span>
              </div>

              @if (litige.resolution) {
                <div class="litige-resolution">
                  <strong>Résolution ({{ litige.dateResolution }}) :</strong> {{ litige.resolution }}
                </div>
              }

              @if (litige.statut === StatutLitige.OUVERT || litige.statut === StatutLitige.EN_COURS) {
                <button type="button" class="action-btn" (click)="ouvrirResolution(litige)">
                  Résoudre ce litige
                </button>
              }
            </div>
          }
        </div>
      }
    </div>

    @if (litigeCible) {
      <div class="resolution-overlay">
        <div class="resolution-box">
          <label class="resolution-label" for="resolution-text">Détail de la résolution</label>
          <textarea
            id="resolution-text"
            class="resolution-textarea"
            rows="4"
            [(ngModel)]="texteResolution"
            placeholder="Ex : Vérification effectuée, paiement confirmé..."
          ></textarea>
          <div class="resolution-actions">
            <button type="button" class="resolution-btn resolution-btn--cancel" (click)="litigeCible = null">Annuler</button>
            <button type="button" class="resolution-btn resolution-btn--confirm" [disabled]="!texteResolution.trim()" (click)="confirmerResolution()">
              Marquer comme résolu
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .admin-page {
      padding: 2rem;
    }

    .admin-header {
      margin-bottom: 2rem;
    }

    .admin-title {
      font-size: 2rem;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 0.5rem;
    }

    .admin-subtitle {
      font-size: 1rem;
      color: #666;
    }

    .litiges-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .litige-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .litige-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }

    .litige-sujet {
      font-size: 1.125rem;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 0.375rem;
    }

    .litige-meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .litige-date {
      font-size: 0.8125rem;
      color: #888;
    }

    .priorite-pill {
      display: inline-flex;
      padding: 0.2rem 0.625rem;
      border-radius: 999px;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .priorite-pill--haute {
      background: #fee2e2;
      color: #991b1b;
    }

    .priorite-pill--moyenne {
      background: #ffedd5;
      color: #9a3412;
    }

    .priorite-pill--basse {
      background: #e0f2fe;
      color: #075985;
    }

    .litige-description {
      font-size: 0.9375rem;
      color: #444;
      margin-bottom: 1rem;
      line-height: 1.5;
    }

    .litige-parties {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
      font-size: 0.875rem;
      color: #555;
      margin-bottom: 1rem;
    }

    .litige-resolution {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 0.875rem 1rem;
      font-size: 0.875rem;
      color: #166534;
      margin-bottom: 1rem;
    }

    .action-btn {
      min-height: 44px;
      padding: 0 1.25rem;
      border-radius: 8px;
      border: none;
      background: var(--color-primary);
      color: white;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
    }

    .action-btn:hover {
      background: var(--color-primary-dark);
    }

    .resolution-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .resolution-box {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      width: 100%;
      max-width: 480px;
    }

    .resolution-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 0.5rem;
    }

    .resolution-textarea {
      width: 100%;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 0.75rem;
      font-size: 0.9375rem;
      font-family: inherit;
      resize: vertical;
    }

    .resolution-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .resolution-btn {
      min-height: 44px;
      padding: 0 1.25rem;
      border-radius: 8px;
      border: none;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
    }

    .resolution-btn--cancel {
      background: #f0f0f0;
      color: #444;
    }

    .resolution-btn--confirm {
      background: var(--color-primary);
      color: white;
    }

    .resolution-btn--confirm:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .admin-page {
        padding: 1rem;
      }

      .admin-title {
        font-size: 1.5rem;
      }
    }
  `
})
export class LitigesComponent implements OnInit {
  litiges: Litige[] = [];
  loading = true;
  litigeCible: Litige | null = null;
  texteResolution = '';
  readonly StatutLitige = StatutLitige;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.adminService.getLitiges().subscribe(litiges => {
      this.litiges = litiges;
      this.loading = false;
    });
  }

  ouvrirResolution(litige: Litige): void {
    this.litigeCible = litige;
    this.texteResolution = '';
  }

  confirmerResolution(): void {
    if (!this.litigeCible || !this.texteResolution.trim()) {
      return;
    }
    this.adminService.resoudreLitige(this.litigeCible.id, this.texteResolution.trim()).subscribe(litigeMaj => {
      const index = this.litiges.findIndex(l => l.id === litigeMaj.id);
      if (index !== -1) {
        this.litiges[index] = litigeMaj;
      }
      this.litigeCible = null;
    });
  }

  labelPriorite(priorite: PrioriteLitige): string {
    switch (priorite) {
      case PrioriteLitige.HAUTE:
        return 'Priorité haute';
      case PrioriteLitige.MOYENNE:
        return 'Priorité moyenne';
      case PrioriteLitige.BASSE:
        return 'Priorité basse';
      default:
        return priorite;
    }
  }

  prioriteClasses(priorite: PrioriteLitige): string {
    switch (priorite) {
      case PrioriteLitige.HAUTE:
        return 'priorite-pill--haute';
      case PrioriteLitige.MOYENNE:
        return 'priorite-pill--moyenne';
      case PrioriteLitige.BASSE:
        return 'priorite-pill--basse';
      default:
        return '';
    }
  }
}

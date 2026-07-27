import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { CompteUtilisateur, RoleUtilisateur, StatutCompte } from '@core/models/admin.model';
import { LokBadgeStatutCompteComponent } from '../../../../shared/components/lok-badge-statut-compte/lok-badge-statut-compte.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';
import { LokConfirmModalComponent } from '../../../../shared/components/lok-confirm-modal/lok-confirm-modal.component';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokDatePipe } from '../../../../shared/pipes/lok-date.pipe';

@Component({
  selector: 'app-comptes',
  standalone: true,
  imports: [CommonModule, FormsModule, LokBadgeStatutCompteComponent, LokSkeletonComponent, LokEmptyStateComponent, LokConfirmModalComponent, LokAlerteComponent, LokDatePipe],
  template: `
    <div class="admin-page">
      <div class="admin-header">
        <div>
          <h1 class="admin-title">Gestion des comptes</h1>
          <p class="admin-subtitle">Propriétaires, locataires et gestionnaires immobiliers inscrits sur WARAH</p>
        </div>
        <button type="button" class="btn-creer" (click)="ouvrirModalCreation()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Créer un compte
        </button>
      </div>

      <div class="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" class="search-icon">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="search" [(ngModel)]="recherche" placeholder="Rechercher par nom, email, rôle…" class="search-input">
        @if (recherche) {
          <span class="search-count">{{ comptesFiltres.length }} résultat{{ comptesFiltres.length > 1 ? 's' : '' }}</span>
        }
      </div>

      @if (loading) {
        <lok-skeleton type="list" [count]="4"></lok-skeleton>
      } @else if (comptesFiltres.length === 0) {
        <lok-empty-state
          titre="Aucun compte"
          description="Aucun compte utilisateur n'a encore été enregistré."
          icon="default"
        ></lok-empty-state>
      } @else {
        <div class="table-wrap">
          <table class="comptes-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Rôle</th>
                <th>Inscription</th>
                <th>Biens</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              @for (compte of comptesFiltres; track compte.id) {
                <tr>
                  <td>
                    <div class="user-cell">
                      <span class="user-name">{{ compte.prenom }} {{ compte.nom }}</span>
                      <span class="user-email">{{ compte.email }}</span>
                    </div>
                  </td>
                  <td>{{ labelRole(compte.role) }}</td>
                  <td>{{ compte.dateInscription | lokDate }}</td>
                  <td>{{ compte.nombreBiens ?? '—' }}</td>
                  <td><lok-badge-statut-compte [statut]="compte.statut"></lok-badge-statut-compte></td>
                  <td>
                    <div class="actions-cell">
                      <button type="button" class="action-btn action-btn--suspendre"
                        [disabled]="compte.statut !== StatutCompte.ACTIF"
                        (click)="demanderSuspension(compte)" title="Suspendre ce compte">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="10" y1="15" x2="10" y2="9"/>
                          <line x1="14" y1="15" x2="14" y2="9"/>
                        </svg>
                      </button>
                      <button type="button" class="action-btn action-btn--activer"
                        [disabled]="compte.statut === StatutCompte.ACTIF"
                        (click)="demanderActivation(compte)" title="Réactiver ce compte">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="10 8 16 12 10 16 10 8"/>
                        </svg>
                      </button>
                      <button type="button" class="action-btn action-btn--supprimer"
                        (click)="demanderSuppression(compte)" title="Supprimer définitivement">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <!-- Modale création de compte -->
    @if (modalCreation) {
      <div class="modal-overlay" (click)="fermerModalCreation()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="modal-title">Créer un compte</h2>
            <button type="button" class="modal-close" (click)="fermerModalCreation()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          @if (creationErreur) {
            <lok-alerte type="error" [message]="creationErreur"></lok-alerte>
          }
          @if (creationSucces) {
            <lok-alerte type="success" message="Compte créé avec succès !"></lok-alerte>
          }

          @if (!creationSucces) {
            <div class="form-grid">
              <div class="form-group">
                <label>Prénom *</label>
                <input type="text" [(ngModel)]="nouveauCompte.prenom" placeholder="Jean">
              </div>
              <div class="form-group">
                <label>Nom *</label>
                <input type="text" [(ngModel)]="nouveauCompte.nom" placeholder="Kouassi">
              </div>
              <div class="form-group form-group--full">
                <label>Email *</label>
                <input type="email" [(ngModel)]="nouveauCompte.email" placeholder="jean@email.com">
              </div>
              <div class="form-group">
                <label>Téléphone</label>
                <input type="tel" [(ngModel)]="nouveauCompte.telephone" placeholder="+228 90 00 00 00">
              </div>
              <div class="form-group">
                <label>Rôle *</label>
                <select [(ngModel)]="nouveauCompte.role">
                  <option value="OWNER">Propriétaire</option>
                  <option value="MANAGER">Gestionnaire</option>
                </select>
              </div>
              <div class="form-group form-group--full">
                <label>Mot de passe temporaire *</label>
                <input type="password" [(ngModel)]="nouveauCompte.motDePasse" placeholder="Minimum 8 caractères">
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-annuler" (click)="fermerModalCreation()">Annuler</button>
              <button type="button" class="btn-confirmer"
                [disabled]="creationChargement || !nouveauCompte.prenom || !nouveauCompte.nom || !nouveauCompte.email || !nouveauCompte.motDePasse"
                (click)="confirmerCreation()">
                {{ creationChargement ? 'Création…' : 'Créer le compte' }}
              </button>
            </div>
          }
        </div>
      </div>
    }

    @if (compteCible) {
      <lok-confirm-modal
        [titre]="compteCible.statut === StatutCompte.ACTIF ? 'Suspendre ce compte ?' : 'Réactiver ce compte ?'"
        [message]="compteCible.statut === StatutCompte.ACTIF
          ? (compteCible.prenom + ' ' + compteCible.nom + ' ne pourra plus accéder à la plateforme.')
          : (compteCible.prenom + ' ' + compteCible.nom + ' retrouvera l\\'accès à son compte.')"
        confirmLabel="Confirmer"
        cancelLabel="Annuler"
        (onConfirm)="confirmerChangementStatut()"
        (onCancel)="compteCible = null"
      ></lok-confirm-modal>
    }

    @if (compteSuppression) {
      <lok-confirm-modal
        titre="Supprimer définitivement ce compte ?"
        [message]="'Cette action est irréversible. Le compte de ' + compteSuppression.prenom + ' ' + compteSuppression.nom + ' et toutes ses données seront définitivement supprimés.'"
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        (onConfirm)="confirmerSuppression()"
        (onCancel)="compteSuppression = null"
      ></lok-confirm-modal>
    }
  `,
  styles: `
    .admin-page { padding: 2rem; }

    .admin-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap;
    }

    .admin-title { font-size: 2rem; font-weight: 700; color: #1a1a1a; margin-bottom: 0.5rem; }
    .admin-subtitle { font-size: 1rem; color: #666; }

    .search-bar {
      display: flex; align-items: center; gap: 10px;
      background: #f8f9fb; border: 1.5px solid #e5e7eb; border-radius: 10px;
      padding: 0.5rem 1rem; margin-bottom: 1.25rem;
      transition: border-color .15s;
    }
    .search-bar:focus-within { border-color: var(--color-primary); }
    .search-icon { color: #9ca3af; flex-shrink: 0; }
    .search-input {
      flex: 1; border: none; background: transparent; font-size: 0.9375rem;
      outline: none; color: #111827;
    }
    .search-input::placeholder { color: #9ca3af; }
    .search-count {
      font-size: 0.75rem; font-weight: 600; color: var(--color-primary);
      background: rgba(15,76,129,0.08); padding: 2px 8px; border-radius: 99px;
      white-space: nowrap;
    }

    .btn-creer {
      display: flex; align-items: center; gap: 8px;
      background: var(--color-primary); color: white; border: none; border-radius: 10px;
      padding: 0.625rem 1.25rem; font-size: 0.875rem; font-weight: 600;
      cursor: pointer; white-space: nowrap; transition: background .15s;
      min-height: 44px;
    }
    .btn-creer:hover { background: var(--color-primary-dark); }

    /* Modale */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 200; padding: 1rem;
    }
    .modal-box {
      background: white; border-radius: 16px; width: 100%; max-width: 500px;
      padding: 1.75rem; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }
    .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
    .modal-title { font-size: 1.25rem; font-weight: 700; color: #1a1a1a; }
    .modal-close { background: none; border: none; cursor: pointer; color: #888; padding: 4px; border-radius: 6px; transition: color .15s; }
    .modal-close:hover { color: #333; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group--full { grid-column: 1 / -1; }
    .form-group label { font-size: 0.8125rem; font-weight: 600; color: #374151; }
    .form-group input, .form-group select {
      border: 1.5px solid #d1d5db; border-radius: 8px; padding: 0.5rem 0.75rem;
      font-size: 0.9375rem; outline: none; transition: border-color .15s; width: 100%;
    }
    .form-group input:focus, .form-group select:focus { border-color: var(--color-primary); }

    .modal-footer { display: flex; gap: 0.75rem; justify-content: flex-end; }
    .btn-annuler {
      border: 1.5px solid #d1d5db; background: white; border-radius: 8px;
      padding: 0.5rem 1.25rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: border-color .15s;
    }
    .btn-annuler:hover { border-color: var(--color-primary); color: #0F4C81; }
    .btn-confirmer {
      background: var(--color-primary); color: white; border: none; border-radius: 8px;
      padding: 0.5rem 1.25rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: background .15s;
    }
    .btn-confirmer:hover:not(:disabled) { background: var(--color-primary-dark); }
    .btn-confirmer:disabled { opacity: 0.55; cursor: not-allowed; }

    .table-wrap {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow-x: auto;
    }

    .comptes-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 640px;
    }

    .comptes-table th {
      text-align: left;
      padding: 1rem 1.25rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-bottom: 2px solid #f0f0f0;
    }

    .comptes-table td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f0f0f0;
      font-size: 0.9375rem;
      color: #333;
      vertical-align: middle;
    }

    .user-cell {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .user-name {
      font-weight: 600;
      color: #1a1a1a;
    }

    .user-email {
      font-size: 0.8125rem;
      color: #888;
    }

    .action-btn {
      border-radius: 8px;
      border: none;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s;
    }

    .action-btn--suspendre {
      background: #fee2e2;
      color: #991b1b;
      min-height: 36px;
      min-width: 36px;
      padding: 0 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .action-btn--suspendre:hover:not(:disabled) { background: #fecaca; }
    .action-btn--suspendre:disabled { background: #f5f5f5; color: #ccc; cursor: not-allowed; }

    .action-btn--activer {
      background: #dcfce7;
      color: #166534;
      min-height: 36px;
      min-width: 36px;
      padding: 0 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .action-btn--activer:hover:not(:disabled) { background: #bbf7d0; }
    .action-btn--activer:disabled { background: #f5f5f5; color: #ccc; cursor: not-allowed; }

    .action-muted {
      color: #aaa;
    }

    .actions-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .action-btn--supprimer {
      background: #fff0f0;
      color: #991b1b;
      min-height: 36px;
      min-width: 36px;
      padding: 0 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: background .15s;
    }

    .action-btn--supprimer:hover {
      background: #fecaca;
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
export class ComptesComponent implements OnInit {
  comptes: CompteUtilisateur[] = [];
  loading = true;
  recherche = '';
  compteCible: CompteUtilisateur | null = null;
  compteSuppression: CompteUtilisateur | null = null;
  readonly StatutCompte = StatutCompte;

  get comptesFiltres(): CompteUtilisateur[] {
    if (!this.recherche.trim()) return this.comptes;
    const q = this.recherche.toLowerCase();
    return this.comptes.filter(c =>
      c.prenom.toLowerCase().includes(q) ||
      c.nom.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      this.labelRole(c.role).toLowerCase().includes(q)
    );
  }

  // Création de compte
  modalCreation = false;
  creationChargement = false;
  creationErreur = '';
  creationSucces = false;
  nouveauCompte = { prenom: '', nom: '', email: '', telephone: '', role: 'OWNER' as 'OWNER' | 'MANAGER', motDePasse: '' };

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.adminService.getComptes().subscribe(comptes => {
      this.comptes = comptes;
      this.loading = false;
    });
  }

  labelRole(role: RoleUtilisateur): string {
    switch (role) {
      case RoleUtilisateur.PROPRIETAIRE:
        return 'Propriétaire';
      case RoleUtilisateur.LOCATAIRE:
        return 'Locataire';
      case RoleUtilisateur.GESTIONNAIRE:
        return 'Gestionnaire';
      default:
        return role;
    }
  }

  demanderSuspension(compte: CompteUtilisateur): void {
    this.compteCible = compte;
  }

  demanderActivation(compte: CompteUtilisateur): void {
    this.compteCible = compte;
  }

  confirmerChangementStatut(): void {
    if (!this.compteCible) return;
    const id = this.compteCible.id;
    const nouveauStatut = this.compteCible.statut === StatutCompte.ACTIF ? StatutCompte.SUSPENDU : StatutCompte.ACTIF;
    this.adminService.changerStatutCompte(id, nouveauStatut).subscribe({
      next: () => {
        this.comptes = this.comptes.map(c =>
          c.id === id ? { ...c, statut: nouveauStatut } : c
        );
        this.compteCible = null;
      },
      error: () => {
        this.compteCible = null;
      },
    });
  }

  demanderSuppression(compte: CompteUtilisateur): void {
    this.compteSuppression = compte;
  }

  confirmerSuppression(): void {
    if (!this.compteSuppression) return;
    const id = this.compteSuppression.id;
    this.compteSuppression = null;
    this.adminService.supprimerCompte(id).subscribe({
      next: () => {
        this.comptes = this.comptes.filter(c => c.id !== id);
      },
      error: (err: any) => {
        console.error('Erreur suppression compte:', err);
      },
    });
  }

  ouvrirModalCreation(): void {
    this.modalCreation = true;
    this.creationErreur = '';
    this.creationSucces = false;
    this.nouveauCompte = { prenom: '', nom: '', email: '', telephone: '', role: 'OWNER', motDePasse: '' };
  }

  fermerModalCreation(): void {
    this.modalCreation = false;
    this.creationErreur = '';
    this.creationSucces = false;
  }

  confirmerCreation(): void {
    this.creationChargement = true;
    this.creationErreur = '';
    this.adminService.creerCompte(this.nouveauCompte).subscribe({
      next: (compte) => {
        this.creationChargement = false;
        this.creationSucces = true;
        this.comptes = [compte, ...this.comptes];
        setTimeout(() => this.fermerModalCreation(), 1500);
      },
      error: (err: any) => {
        this.creationChargement = false;
        this.creationErreur = err.error?.message || 'Erreur lors de la création du compte';
      },
    });
  }
}

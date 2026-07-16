import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AdminService } from "../../services/admin.service";
import {
  CompteUtilisateur,
  RoleUtilisateur,
  StatutCompte,
} from "@core/models/admin.model";
import { LokBadgeStatutCompteComponent } from "../../../../shared/components/lok-badge-statut-compte/lok-badge-statut-compte.component";
import { LokSkeletonComponent } from "../../../../shared/components/lok-skeleton/lok-skeleton.component";
import { LokEmptyStateComponent } from "../../../../shared/components/lok-empty-state/lok-empty-state.component";
import { LokConfirmModalComponent } from "../../../../shared/components/lok-confirm-modal/lok-confirm-modal.component";

@Component({
  selector: "app-comptes",
  standalone: true,
  imports: [
    CommonModule,
    LokBadgeStatutCompteComponent,
    LokSkeletonComponent,
    LokEmptyStateComponent,
    LokConfirmModalComponent,
  ],
  template: `
    <div class="admin-page">
      <div class="admin-header">
        <h1 class="admin-title">Gestion des comptes</h1>
        <p class="admin-subtitle">
          Propriétaires, locataires et gestionnaires inscrits sur WARAH
        </p>
      </div>

      @if (loading) {
        <lok-skeleton type="list" [count]="4"></lok-skeleton>
      } @else if (comptes.length === 0) {
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
              @for (compte of comptes; track compte.id) {
                <tr>
                  <td>
                    <div class="user-cell">
                      <span class="user-name"
                        >{{ compte.prenom }} {{ compte.nom }}</span
                      >
                      <span class="user-email">{{ compte.email }}</span>
                    </div>
                  </td>
                  <td>{{ labelRole(compte.role) }}</td>
                  <td>{{ compte.dateInscription }}</td>
                  <td>{{ compte.nombreBiens ?? "—" }}</td>
                  <td>
                    <lok-badge-statut-compte
                      [statut]="compte.statut"
                    ></lok-badge-statut-compte>
                  </td>
                  <td>
                    @if (compte.statut === StatutCompte.SUSPENDU) {
                      <button
                        type="button"
                        class="action-btn action-btn--activer"
                        (click)="demanderActivation(compte)"
                      >
                        Réactiver
                      </button>
                    } @else if (compte.statut === StatutCompte.ACTIF) {
                      <button
                        type="button"
                        class="action-btn action-btn--suspendre"
                        (click)="demanderSuspension(compte)"
                      >
                        Suspendre
                      </button>
                    } @else {
                      <span class="action-muted">—</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (compteCible) {
      <lok-confirm-modal
        [titre]="
          compteCible.statut === StatutCompte.ACTIF
            ? 'Suspendre ce compte ?'
            : 'Réactiver ce compte ?'
        "
        [message]="confirmModalMessage"
        confirmLabel="Confirmer"
        cancelLabel="Annuler"
        (confirm)="confirmerChangementStatut()"
        (cancelled)="compteCible = null"
      ></lok-confirm-modal>
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
      min-height: 44px;
      padding: 0 1rem;
      border-radius: 8px;
      border: none;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
    }

    .action-btn--suspendre {
      background: #fee2e2;
      color: #991b1b;
    }

    .action-btn--suspendre:hover {
      background: #fecaca;
    }

    .action-btn--activer {
      background: #dcfce7;
      color: #166534;
    }

    .action-btn--activer:hover {
      background: #bbf7d0;
    }

    .action-muted {
      color: #aaa;
    }

    @media (max-width: 768px) {
      .admin-page {
        padding: 1rem;
      }

      .admin-title {
        font-size: 1.5rem;
      }
    }
  `,
})
export class ComptesComponent implements OnInit {
  comptes: CompteUtilisateur[] = [];
  loading = true;
  compteCible: CompteUtilisateur | null = null;
  readonly StatutCompte = StatutCompte;

  private readonly adminService = inject(AdminService);

  ngOnInit(): void {
    this.adminService.getComptes().subscribe((comptes) => {
      this.comptes = comptes;
      this.loading = false;
    });
  }

  labelRole(role: RoleUtilisateur): string {
    switch (role) {
      case RoleUtilisateur.PROPRIETAIRE:
        return "Propriétaire";
      case RoleUtilisateur.LOCATAIRE:
        return "Locataire";
      case RoleUtilisateur.GESTIONNAIRE:
        return "Gestionnaire";
      default:
        return role;
    }
  }

  // Calculé en TypeScript plutôt qu'inline dans le template — l'apostrophe
  // de « l'accès » rendait l'expression illisible et cassait le parseur de
  // templates Angular (« Missing closing parentheses »).
  get confirmModalMessage(): string {
    if (!this.compteCible) {
      return "";
    }
    const nomComplet = `${this.compteCible.prenom} ${this.compteCible.nom}`;
    return this.compteCible.statut === StatutCompte.ACTIF
      ? `${nomComplet} ne pourra plus accéder à la plateforme.`
      : `${nomComplet} retrouvera l'accès à son compte.`;
  }

  demanderSuspension(compte: CompteUtilisateur): void {
    this.compteCible = compte;
  }

  demanderActivation(compte: CompteUtilisateur): void {
    this.compteCible = compte;
  }

  confirmerChangementStatut(): void {
    if (!this.compteCible) {
      return;
    }
    const nouveauStatut =
      this.compteCible.statut === StatutCompte.ACTIF
        ? StatutCompte.SUSPENDU
        : StatutCompte.ACTIF;
    this.adminService
      .changerStatutCompte(this.compteCible.id, nouveauStatut)
      .subscribe((compteMaj) => {
        const index = this.comptes.findIndex((c) => c.id === compteMaj.id);
        if (index !== -1) {
          this.comptes[index] = compteMaj;
        }
        this.compteCible = null;
      });
  }
}

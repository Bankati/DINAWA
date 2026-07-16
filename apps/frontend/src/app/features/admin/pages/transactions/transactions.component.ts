import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AdminService } from "../../services/admin.service";
import {
  TransactionSupervisee,
  StatutTransaction,
} from "@core/models/admin.model";
import { LokMontantFcfaComponent } from "../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component";
import { LokSkeletonComponent } from "../../../../shared/components/lok-skeleton/lok-skeleton.component";
import { LokEmptyStateComponent } from "../../../../shared/components/lok-empty-state/lok-empty-state.component";

@Component({
  selector: "app-transactions",
  standalone: true,
  imports: [
    CommonModule,
    LokMontantFcfaComponent,
    LokSkeletonComponent,
    LokEmptyStateComponent,
  ],
  template: `
    <div class="admin-page">
      <div class="admin-header">
        <h1 class="admin-title">Supervision des transactions</h1>
        <p class="admin-subtitle">Paiements traités sur la plateforme WARAH</p>
      </div>

      @if (loading) {
        <lok-skeleton type="list" [count]="4"></lok-skeleton>
      } @else if (transactions.length === 0) {
        <lok-empty-state
          titre="Aucune transaction"
          description="Aucune transaction n'a encore été enregistrée."
          icon="paiement"
        ></lok-empty-state>
      } @else {
        <div class="table-wrap">
          <table class="transactions-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Bien</th>
                <th>Propriétaire</th>
                <th>Locataire</th>
                <th>Mode</th>
                <th>Montant</th>
                <th>Commission</th>
                <th>Date</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              @for (txn of transactions; track txn.id) {
                <tr>
                  <td class="ref-cell">{{ txn.reference }}</td>
                  <td>{{ txn.bien }}</td>
                  <td>{{ txn.proprietaire }}</td>
                  <td>{{ txn.locataire }}</td>
                  <td>{{ labelMode(txn.modePaiement) }}</td>
                  <td>
                    <lok-montant-fcfa
                      [montant]="txn.montant"
                      size="sm"
                    ></lok-montant-fcfa>
                  </td>
                  <td>
                    <lok-montant-fcfa
                      [montant]="txn.commission"
                      size="sm"
                      color="primary"
                    ></lok-montant-fcfa>
                  </td>
                  <td>{{ txn.date }}</td>
                  <td>
                    <span
                      class="statut-pill"
                      [class]="statutClasses(txn.statut)"
                      >{{ labelStatut(txn.statut) }}</span
                    >
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
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

    .transactions-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 880px;
    }

    .transactions-table th {
      text-align: left;
      padding: 1rem 1.25rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-bottom: 2px solid #f0f0f0;
      white-space: nowrap;
    }

    .transactions-table td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f0f0f0;
      font-size: 0.9375rem;
      color: #333;
      vertical-align: middle;
      white-space: nowrap;
    }

    .ref-cell {
      font-family: monospace;
      font-size: 0.8125rem;
      color: #555;
    }

    .statut-pill {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .statut-pill--reussie {
      background: #dcfce7;
      color: #166534;
    }

    .statut-pill--attente {
      background: #ffedd5;
      color: #9a3412;
    }

    .statut-pill--echouee {
      background: #fee2e2;
      color: #991b1b;
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
export class TransactionsComponent implements OnInit {
  transactions: TransactionSupervisee[] = [];
  loading = true;

  private readonly adminService = inject(AdminService);

  ngOnInit(): void {
    this.adminService.getTransactions().subscribe((transactions) => {
      this.transactions = transactions;
      this.loading = false;
    });
  }

  labelMode(mode: string): string {
    switch (mode) {
      case "T_MONEY":
        return "T-Money";
      case "FLOOZ":
        return "Flooz";
      case "ESPECES":
        return "Espèces";
      default:
        return mode;
    }
  }

  labelStatut(statut: StatutTransaction): string {
    switch (statut) {
      case StatutTransaction.REUSSIE:
        return "Réussie";
      case StatutTransaction.EN_ATTENTE:
        return "En attente";
      case StatutTransaction.ECHOUEE:
        return "Échouée";
      default:
        return statut;
    }
  }

  statutClasses(statut: StatutTransaction): string {
    switch (statut) {
      case StatutTransaction.REUSSIE:
        return "statut-pill--reussie";
      case StatutTransaction.EN_ATTENTE:
        return "statut-pill--attente";
      case StatutTransaction.ECHOUEE:
        return "statut-pill--echouee";
      default:
        return "";
    }
  }
}

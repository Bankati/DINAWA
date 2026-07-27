import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokMontantFcfaComponent } from '../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component';
import { CommonModule } from '@angular/common';
import { LokDatePipe } from '../../../../shared/pipes/lok-date.pipe';
import { environment } from '@env/environment';

interface Logement {
  titre: string;
  adresse: string;
  loyer: number;
  charges: number;
  dateEntree: Date;
  finBail: Date | null;
}

@Component({
  selector: 'app-locataire-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LokAlerteComponent,
    LokMontantFcfaComponent,
    LokDatePipe,
  ],
  styles: [`
    .loc-page { min-height: 100vh; background: #F4F1ED; }

    /* ── Header ── */
    .loc-header {
      background: linear-gradient(135deg, #0A2650 0%, #0F4C81 60%, #081E41 100%);
      padding: 0 24px;
      display: flex; align-items: center; justify-content: space-between;
      height: 64px; position: sticky; top: 0; z-index: 40;
      box-shadow: 0 2px 12px rgba(10,38,80,0.25);
    }
    .loc-header-logo { display: flex; align-items: center; gap: 10px; }
    .loc-header-logo img { height: 32px; object-fit: contain; filter: brightness(0) invert(1); }
    .loc-header-badge {
      background: rgba(201,152,46,0.2); color: #E0B655;
      border: 1px solid rgba(201,152,46,0.4);
      padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
      letter-spacing: 0.06em; text-transform: uppercase;
    }
    .loc-header-right { display: flex; align-items: center; gap: 12px; }
    .loc-user-name { color: rgba(255,255,255,0.85); font-size: 14px; font-weight: 500; }
    .loc-deco-btn {
      background: rgba(255,255,255,0.1); color: white;
      border: 1px solid rgba(255,255,255,0.2);
      padding: 6px 14px; border-radius: 8px; font-size: 13px;
      cursor: pointer; transition: background 0.15s; text-decoration: none;
    }
    .loc-deco-btn:hover { background: rgba(255,255,255,0.2); }

    /* ── Contenu ── */
    .loc-body { max-width: 860px; margin: 0 auto; padding: 28px 20px; }

    /* ── Card ── */
    .loc-card {
      background: white; border-radius: 14px;
      box-shadow: 0 1px 4px rgba(10,38,80,0.07);
      border: 1px solid #E8E1D8; margin-bottom: 20px; overflow: hidden;
    }
    .loc-card-head {
      padding: 16px 20px; border-bottom: 1px solid #EEE8DF;
      display: flex; align-items: center; justify-content: space-between;
    }
    .loc-card-title {
      font-size: 15px; font-weight: 600; color: #0A2650;
      display: flex; align-items: center; gap: 8px;
    }
    .loc-card-title-dot {
      width: 4px; height: 16px; background: #C9982E;
      border-radius: 2px; display: inline-block;
    }
    .loc-card-body { padding: 20px; }

    /* ── Profil locataire ── */
    .loc-profil { display: flex; align-items: center; gap: 16px; }
    .loc-avatar {
      width: 56px; height: 56px; border-radius: 50%;
      background: linear-gradient(135deg, #0F4C81, #1B6FB8);
      color: white; font-size: 20px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; box-shadow: 0 3px 10px rgba(15,76,129,0.3);
    }
    .loc-profil-name { font-size: 18px; font-weight: 700; color: #0A2650; }
    .loc-profil-info { font-size: 13px; color: #6B7280; margin-top: 2px; }
    .loc-profil-badge {
      display: inline-flex; align-items: center;
      background: #EAF1F8; color: #0F4C81;
      padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.06em; margin-top: 6px;
    }

    /* ── Logement ── */
    .loc-logement { display: flex; gap: 16px; align-items: flex-start; }
    .loc-logement-icon {
      width: 72px; height: 72px; border-radius: 12px;
      background: #EAF1F8; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .loc-logement-icon svg { color: #0F4C81; }
    .loc-logement-title { font-size: 16px; font-weight: 700; color: #0A2650; margin-bottom: 4px; }
    .loc-logement-addr { font-size: 13px; color: #6B7280; margin-bottom: 14px; }
    .loc-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .loc-stat-label { font-size: 12px; color: #9CA3AF; margin-bottom: 2px; }
    .loc-stat-val { font-size: 14px; font-weight: 600; color: #0A2650; }

    /* ── Paiements ── */
    .loc-paiement-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 20px; border-bottom: 1px solid #F3EFE9; transition: background 0.12s;
    }
    .loc-paiement-row:last-child { border-bottom: none; }
    .loc-paiement-row:hover { background: #FAFAF8; }
    .loc-paiement-periode { font-size: 14px; font-weight: 600; color: #0A2650; }
    .loc-paiement-date { font-size: 12px; color: #9CA3AF; margin-top: 2px; }
    .loc-paiement-montant { font-size: 15px; font-weight: 700; color: #0A2650; text-align: right; }
    .badge-paye   { background: #D1FAE5; color: #065F46; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .badge-retard { background: #FEE2E2; color: #991B1B; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .badge-attente{ background: #FEF3C7; color: #92400E; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }

    /* ── Actions rapides ── */
    .loc-actions { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 20px; }
    @media(max-width:640px){ .loc-actions { grid-template-columns: 1fr; } }
    .loc-action-card {
      background: white; border-radius: 14px; padding: 20px;
      border: 1px solid #E8E1D8; cursor: pointer; text-align: left;
      transition: border-color 0.15s, box-shadow 0.15s; display: flex;
      align-items: center; gap: 14px;
      box-shadow: 0 1px 4px rgba(10,38,80,0.06);
    }
    .loc-action-card:hover {
      border-color: #C9982E; box-shadow: 0 4px 14px rgba(201,152,46,0.15);
    }
    .loc-action-icon {
      width: 44px; height: 44px; border-radius: 10px;
      background: #EAF1F8; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .loc-action-icon svg { color: #0F4C81; }
    .loc-action-label { font-size: 14px; font-weight: 600; color: #0A2650; }
    .loc-action-sub { font-size: 12px; color: #9CA3AF; margin-top: 2px; }

    /* ── Demandes ── */
    .loc-demande-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 20px; border-bottom: 1px solid #F3EFE9;
    }
    .loc-demande-row:last-child { border-bottom: none; }
    .badge-encours { background: #FEF3C7; color: #92400E; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .badge-resolu  { background: #D1FAE5; color: #065F46; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .badge-nouveau { background: #EAF1F8; color: #0F4C81; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }

    /* ── Chargement ── */
    .loc-spinner-wrap { padding: 32px; text-align: center; }
    .loc-spinner {
      width: 28px; height: 28px; border-radius: 50%;
      border: 3px solid #E5E7EB; border-top-color: #0F4C81;
      display: inline-block; animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Bouton primaire ── */
    .loc-btn-primary {
      background: linear-gradient(135deg, #0F4C81, #0A2650);
      color: white; padding: 10px 18px; border-radius: 8px;
      font-size: 13px; font-weight: 600; border: none; cursor: pointer;
      transition: opacity 0.15s; text-decoration: none; display: inline-block;
    }
    .loc-btn-primary:hover { opacity: 0.9; }
    .loc-btn-full { width: 100%; text-align: center; padding: 12px; }

    /* ── Modal ── */
    .loc-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; }
    .loc-modal { background: white; border-radius: 16px; padding: 24px; max-width: 440px; width: calc(100% - 32px); }
    .loc-modal-title { font-size: 16px; font-weight: 700; color: #0A2650; margin-bottom: 18px; }
    .loc-label { font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 6px; display: block; }
    .loc-gap { display: flex; flex-direction: column; gap: 14px; }
    .loc-row-btns { display: flex; gap: 10px; }
    .loc-btn-secondary {
      background: #F4F1ED; color: #374151; padding: 10px 18px; border-radius: 8px;
      font-size: 13px; font-weight: 600; border: 1px solid #E8E1D8; cursor: pointer;
    }
    .loc-empty { padding: 28px; text-align: center; color: #9CA3AF; font-size: 14px; }
  `],
  template: `
    <div class="loc-page">

      <!-- Header WARAH -->
      <header class="loc-header">
        <div class="loc-header-logo">
          <img src="/assets/WARAH-logo.png" alt="WARAH">
          <span class="loc-header-badge">Locataire</span>
        </div>
        <div class="loc-header-right">
          <span class="loc-user-name">{{ locataire.prenom }} {{ locataire.nom }}</span>
          <a routerLink="/auth/login" class="loc-deco-btn">Déconnexion</a>
        </div>
      </header>

      <div class="loc-body">

        @if (errorMessage) {
          <lok-alerte type="error" [message]="errorMessage"></lok-alerte>
        }
        @if (successMessage) {
          <lok-alerte type="success" [message]="successMessage"></lok-alerte>
        }

        <!-- Profil -->
        <div class="loc-card">
          <div class="loc-card-body">
            <div class="loc-profil">
              <div class="loc-avatar">{{ (locataire.prenom[0] || '?') }}{{ (locataire.nom[0] || '') }}</div>
              <div>
                <div class="loc-profil-name">{{ locataire.prenom }} {{ locataire.nom }}</div>
                <div class="loc-profil-info">{{ locataire.email }}</div>
                <div class="loc-profil-info">{{ locataire.telephone }}</div>
                <span class="loc-profil-badge">Locataire</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Mon logement -->
        <div class="loc-card">
          <div class="loc-card-head">
            <span class="loc-card-title">
              <span class="loc-card-title-dot"></span>
              Mon logement
            </span>
          </div>
          @if (chargementLogement) {
            <div class="loc-spinner-wrap"><span class="loc-spinner"></span></div>
          } @else if (!logement) {
            <div class="loc-empty">Aucun bail actif trouvé</div>
          } @else {
            <div class="loc-card-body">
              <div class="loc-logement">
                <div class="loc-logement-icon">
                  <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                  </svg>
                </div>
                <div style="flex:1">
                  <div class="loc-logement-title">{{ logement.titre }}</div>
                  <div class="loc-logement-addr">{{ logement.adresse }}</div>
                  <div class="loc-grid2">
                    <div>
                      <div class="loc-stat-label">Loyer mensuel</div>
                      <div class="loc-stat-val"><lok-montant-fcfa [montant]="logement.loyer"></lok-montant-fcfa></div>
                    </div>
                    <div>
                      <div class="loc-stat-label">Charges</div>
                      <div class="loc-stat-val"><lok-montant-fcfa [montant]="logement.charges"></lok-montant-fcfa></div>
                    </div>
                    <div>
                      <div class="loc-stat-label">Date d'entrée</div>
                      <div class="loc-stat-val">{{ logement.dateEntree | lokDate:'date' }}</div>
                    </div>
                    <div>
                      <div class="loc-stat-label">Fin de bail</div>
                      <div class="loc-stat-val">{{ logement.finBail ? (logement.finBail | lokDate:'date') : 'Indéterminée' }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Actions rapides -->
        <div class="loc-actions">
          <button class="loc-action-card" routerLink="/paiements/nouveau">
            <div class="loc-action-icon">
              <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <div class="loc-action-label">Payer mon loyer</div>
              <div class="loc-action-sub">Effectuer un paiement</div>
            </div>
          </button>

          <button class="loc-action-card" routerLink="/notifications/messagerie">
            <div class="loc-action-icon">
              <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <div>
              <div class="loc-action-label">Contacter propriétaire</div>
              <div class="loc-action-sub">Envoyer un message</div>
            </div>
          </button>

          <button class="loc-action-card" routerLink="/locataire">
            <div class="loc-action-icon">
              <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div>
              <div class="loc-action-label">Mon contrat</div>
              <div class="loc-action-sub">Voir mon bail</div>
            </div>
          </button>
        </div>

        <!-- Paiements -->
        <div class="loc-card">
          <div class="loc-card-head">
            <span class="loc-card-title">
              <span class="loc-card-title-dot"></span>
              Mes paiements
            </span>
            <button class="loc-btn-primary" routerLink="/paiements/nouveau">Effectuer un paiement</button>
          </div>
          <div class="loc-empty">L'historique des paiements sera disponible prochainement</div>
        </div>

        <!-- Demandes -->
        <div class="loc-card">
          <div class="loc-card-head">
            <span class="loc-card-title">
              <span class="loc-card-title-dot"></span>
              Mes demandes
            </span>
          </div>
          @if (demandes.length === 0) {
            <div class="loc-empty">Aucune demande en cours</div>
          } @else {
            @for (demande of demandes; track demande.id) {
              <div class="loc-demande-row">
                <div>
                  <div style="font-size:14px;font-weight:600;color:#0A2650">{{ demande.titre }}</div>
                  <div style="font-size:12px;color:#9CA3AF;margin-top:2px">{{ demande.date | lokDate }}</div>
                </div>
                <span [class]="demande.statut === 'en_cours' ? 'badge-encours' : demande.statut === 'resolu' ? 'badge-resolu' : 'badge-nouveau'">
                  {{ demande.statut === 'en_cours' ? 'En cours' : demande.statut === 'resolu' ? 'Résolu' : 'Nouveau' }}
                </span>
              </div>
            }
          }
          <div style="padding:16px 20px;border-top:1px solid #EEE8DF">
            <button class="loc-btn-primary loc-btn-full" (click)="showNewDemande = true">Nouvelle demande</button>
          </div>
        </div>

      </div><!-- /loc-body -->
    </div><!-- /loc-page -->

    <!-- Modal nouvelle demande -->
    @if (showNewDemande) {
      <div class="loc-modal-overlay">
        <div class="loc-modal">
          <div class="loc-modal-title">Nouvelle demande</div>
          <div class="loc-gap">
            <div>
              <label class="loc-label">Type de demande</label>
              <select class="input-field">
                <option value="maintenance">Maintenance / Réparation</option>
                <option value="renouvellement">Renouvellement de bail</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label class="loc-label">Description</label>
              <textarea class="input-field" rows="4" placeholder="Décrivez votre demande..."></textarea>
            </div>
            <div class="loc-row-btns">
              <button class="loc-btn-primary" style="flex:1" (click)="envoyerDemande()">Envoyer</button>
              <button class="loc-btn-secondary" style="flex:1" (click)="showNewDemande = false">Annuler</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class LocataireDashboardComponent implements OnInit {
  locataire = { prenom: '', nom: '', email: '', telephone: '' };

  logement: Logement | null = null;
  chargementLogement = true;

  demandes: { id: string; titre: string; date: Date; statut: string }[] = [];

  showNewDemande = false;
  errorMessage = '';
  successMessage = '';

  private readonly apiUrl = `${environment.apiUrl}/tenants`;

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    let userId = '';
    try {
      const raw = localStorage.getItem('warah_user') || localStorage.getItem('WARAH_user');
      if (raw) {
        const u = JSON.parse(raw);
        this.locataire.prenom    = u.firstName || u.prenom || '';
        this.locataire.nom       = u.lastName  || u.nom    || '';
        this.locataire.email     = u.email     || '';
        this.locataire.telephone = u.phone     || u.telephone || '';
        userId = u.id || '';
      }
    } catch { /* localStorage indisponible */ }

    if (userId) {
      this.chargerBail(userId);
    } else {
      this.chargementLogement = false;
    }
  }

  private chargerBail(userId: string): void {
    this.http.get<{ data: any[] }>(`${this.apiUrl}/${userId}/leases/history?limit=5`).subscribe({
      next: (res) => {
        const bail = res.data.find((l: any) => l.status === 'ACTIVE') ?? res.data[0] ?? null;
        if (bail) {
          this.logement = {
            titre: `${bail.property.neighborhood}, ${bail.property.city}`,
            adresse: bail.property.address,
            loyer: bail.monthlyRent,
            charges: bail.monthlyCharges,
            dateEntree: new Date(bail.startDate),
            finBail: bail.endDate ? new Date(bail.endDate) : null,
          };
        }
        this.chargementLogement = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les informations du logement.';
        this.chargementLogement = false;
      },
    });
  }

  envoyerDemande(): void {
    this.showNewDemande = false;
    this.successMessage = 'Demande envoyée avec succès !';
    setTimeout(() => { this.successMessage = ''; }, 3000);
  }
}

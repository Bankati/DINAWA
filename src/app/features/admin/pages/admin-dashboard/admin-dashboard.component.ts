import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { StatistiquesPlateforme, Litige, PrioriteLitige, TransactionSupervisee, StatutTransaction } from '@core/models/admin.model';
import { LokMontantFcfaComponent } from '../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LokMontantFcfaComponent, LokSkeletonComponent],
  template: `
    <div class="admin-page">

      <!-- Topbar -->
      <header class="topbar">
        <div class="topbar-left">
          <div class="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
          <div>
            <h1 class="page-title">Administration</h1>
            <p class="page-sub">{{ dateCourante }}</p>
          </div>
        </div>
        <div class="topbar-right">
          @if (stats && stats.nombreLitigesOuverts > 0) {
            <a routerLink="/admin/litiges" class="litiges-alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              {{ stats.nombreLitigesOuverts }} litige{{ stats.nombreLitigesOuverts > 1 ? 's' : '' }} ouvert{{ stats.nombreLitigesOuverts > 1 ? 's' : '' }}
            </a>
          }
          <div class="topbar-avatar">{{ initiales }}</div>
          <div class="topbar-user-info">
            <p class="topbar-name">{{ nomAdmin }}</p>
            <p class="topbar-role">Administrateur</p>
          </div>
        </div>
      </header>

      <!-- Corps -->
      <div class="admin-body">

        <!-- Bannière -->
        <div class="greeting-banner">
          <div class="gb-dots" aria-hidden="true">
            <span class="gd gd-1"></span><span class="gd gd-2"></span><span class="gd gd-3"></span><span class="gd gd-4"></span><span class="gd gd-5"></span>
          </div>
          <div class="gb-content">
            <p class="greeting-hello">Bonjour, {{ prenomAdmin }} 👋</p>
            <h2 class="greeting-title">Vue d'ensemble de la plateforme</h2>
            <p class="greeting-sub">Supervision en temps réel de l'activité WARAH.</p>
          </div>
          <a routerLink="/admin/comptes" class="btn-accent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Gérer les comptes
          </a>
        </div>

        <!-- KPIs -->
        @if (loading) {
          <div class="kpi-grid">
            @for (i of [1,2,3,4]; track i) {
              <lok-skeleton type="card"></lok-skeleton>
            }
          </div>
        } @else if (stats) {
          <div class="kpi-grid">

            <div class="kpi-card kpi-blue">
              <div class="kpi-top">
                <div class="kpi-icon kpi-icon-blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <svg class="kpi-sparkline" viewBox="0 0 80 28" preserveAspectRatio="none">
                  <polyline [attr.points]="sparkline([4,7,5,9,8,12,14])" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="kpi-body">
                <p class="kpi-label">Utilisateurs inscrits</p>
                <p class="kpi-value">{{ stats.nombreUtilisateurs | number }}</p>
                <p class="kpi-trend-up">&#8593; +{{ stats.croissanceUtilisateursMois }}% ce mois</p>
              </div>
            </div>

            <div class="kpi-card kpi-green">
              <div class="kpi-top">
                <div class="kpi-icon kpi-icon-green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                </div>
                <svg class="kpi-sparkline" viewBox="0 0 80 28" preserveAspectRatio="none">
                  <polyline [attr.points]="sparkline([9,10,9,11,12,11,13])" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="kpi-body">
                <p class="kpi-label">Biens enregistrés</p>
                <p class="kpi-value">{{ stats.nombreBiens | number }}</p>
                <div class="occ-bar"><div class="occ-fill" [style.width.%]="stats.tauxOccupation"></div></div>
                <p class="kpi-sub">{{ stats.tauxOccupation }}% d'occupation</p>
              </div>
            </div>

            <div class="kpi-card kpi-gold">
              <div class="kpi-top">
                <div class="kpi-icon kpi-icon-gold">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <svg class="kpi-sparkline" viewBox="0 0 80 28" preserveAspectRatio="none">
                  <polyline [attr.points]="sparkline([6,8,7,10,9,12,15])" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="kpi-body">
                <p class="kpi-label">Volume transactions (mois)</p>
                <lok-montant-fcfa [montant]="stats.volumeTransactionsMois" size="lg" color="primary"></lok-montant-fcfa>
                <p class="kpi-sub">Commissions : <strong>{{ (stats.commissionsMois / 1000) | number:'1.0-0' }} k FCFA</strong></p>
              </div>
            </div>

            <div class="kpi-card kpi-red">
              <div class="kpi-top">
                <div class="kpi-icon kpi-icon-red">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </div>
              </div>
              <div class="kpi-body">
                <p class="kpi-label">Litiges ouverts</p>
                <p class="kpi-value kpi-red-val">{{ stats.nombreLitigesOuverts }}</p>
                <div class="kpi-pills">
                  <a routerLink="/admin/litiges" class="pill pill-red-link">Voir les litiges</a>
                </div>
              </div>
            </div>
          </div>

          <!-- Litiges + Transactions -->
          <div class="activity-grid">

            <!-- Litiges à traiter -->
            <div class="section-card">
              <div class="section-header">
                <h2 class="section-title">Litiges à traiter</h2>
                <a routerLink="/admin/litiges" class="voir-tout">Voir tout</a>
              </div>
              @if (loadingActivity) {
                <lok-skeleton type="list" [count]="4"></lok-skeleton>
              } @else if (litigesRecents.length === 0) {
                <p class="empty-note">Aucun litige en cours.</p>
              } @else {
                <div class="risk-list">
                  @for (l of litigesRecents; track l.id) {
                    <div class="risk-row">
                      <div class="risk-avatar" [class]="avatarClass(l.priorite)">{{ initialesOf(l.plaignant) }}</div>
                      <div class="risk-body">
                        <p class="risk-name">{{ l.sujet }}</p>
                        <p class="risk-detail">{{ l.plaignant }} → {{ l.misEnCause }}</p>
                      </div>
                      <span class="risk-badge" [class]="badgeClass(l.priorite)">{{ prioriteLabel(l.priorite) }}</span>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Transactions récentes -->
            <div class="section-card">
              <div class="section-header">
                <h2 class="section-title">Transactions récentes</h2>
                <a routerLink="/admin/transactions" class="voir-tout">Voir tout</a>
              </div>
              @if (loadingActivity) {
                <lok-skeleton type="list" [count]="4"></lok-skeleton>
              } @else if (transactionsRecentes.length === 0) {
                <p class="empty-note">Aucune transaction récente.</p>
              } @else {
                <div class="txn-list">
                  @for (t of transactionsRecentes; track t.id) {
                    <div class="txn-row">
                      <span class="txn-dot" [class]="dotClass(t.statut)"></span>
                      <div class="txn-body">
                        <p class="txn-name">{{ t.bien }}</p>
                        <p class="txn-detail">{{ t.locataire }} · {{ modeLabel(t.modePaiement) }}</p>
                      </div>
                      <div class="txn-right">
                        <lok-montant-fcfa [montant]="t.montant" size="sm"></lok-montant-fcfa>
                        <span class="txn-statut" [class]="statutClass(t.statut)">{{ statutLabel(t.statut) }}</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Panneaux détaillés -->
          <div class="panels-grid">

            <!-- Répartition utilisateurs -->
            <div class="section-card">
              <div class="section-header">
                <h2 class="section-title">Répartition des utilisateurs</h2>
                <a routerLink="/admin/comptes" class="voir-tout">Voir les comptes</a>
              </div>
              <div class="role-list">
                <div class="role-row">
                  <div class="role-icon role-blue">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    </svg>
                  </div>
                  <div class="role-info">
                    <div class="role-header">
                      <span class="role-name">Propriétaires</span>
                      <span class="role-count">{{ stats.nombreProprietaires }}</span>
                    </div>
                    <div class="role-bar-bg">
                      <div class="role-bar-fill bar-blue" [style.width.%]="(stats.nombreProprietaires / stats.nombreUtilisateurs) * 100"></div>
                    </div>
                  </div>
                </div>
                <div class="role-row">
                  <div class="role-icon role-green">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <div class="role-info">
                    <div class="role-header">
                      <span class="role-name">Locataires</span>
                      <span class="role-count">{{ stats.nombreLocataires }}</span>
                    </div>
                    <div class="role-bar-bg">
                      <div class="role-bar-fill bar-green" [style.width.%]="(stats.nombreLocataires / stats.nombreUtilisateurs) * 100"></div>
                    </div>
                  </div>
                </div>
                <div class="role-row">
                  <div class="role-icon role-gold">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    </svg>
                  </div>
                  <div class="role-info">
                    <div class="role-header">
                      <span class="role-name">Gestionnaires</span>
                      <span class="role-count">{{ stats.nombreGestionnaires }}</span>
                    </div>
                    <div class="role-bar-bg">
                      <div class="role-bar-fill bar-gold" [style.width.%]="(stats.nombreGestionnaires / stats.nombreUtilisateurs) * 100"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Répartition géographique -->
            <div class="section-card">
              <div class="section-header">
                <h2 class="section-title">Répartition géographique</h2>
                <span class="section-tag">Biens</span>
              </div>
              <div class="ville-list">
                @for (v of stats.repartitionVilles; track v.ville) {
                  <div class="ville-row">
                    <div class="ville-header">
                      <div class="ville-name-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span>{{ v.ville }}</span>
                      </div>
                      <span class="ville-pct">{{ v.pourcentage }}%</span>
                    </div>
                    <div class="ville-bar-bg">
                      <div class="ville-bar-fill" [style.width.%]="v.pourcentage"></div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Commissions -->
            <div class="section-card commissions-card">
              <div class="section-header">
                <h2 class="section-title">Commissions du mois</h2>
                <a routerLink="/admin/transactions" class="voir-tout">Voir les transactions</a>
              </div>
              <div class="commission-amount">
                <lok-montant-fcfa [montant]="stats.commissionsMois" size="xl" color="primary"></lok-montant-fcfa>
              </div>
              <p class="commission-note">Calculées sur l'ensemble des transactions réussies du mois en cours.</p>
              <div class="commission-detail">
                <div class="comm-detail-row">
                  <span class="comm-detail-label">Volume total</span>
                  <span class="comm-detail-val">{{ (stats.volumeTransactionsMois / 1000) | number:'1.0-0' }} k FCFA</span>
                </div>
                <div class="comm-detail-row">
                  <span class="comm-detail-label">Taux moyen</span>
                  <span class="comm-detail-val comm-taux">~5%</span>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    /* ── Page ── */
    .admin-page { min-height: 100vh; background: #F1F4F9; }

    /* ── Topbar ── */
    .topbar {
      position: sticky; top: 0; z-index: 10;
      background: white; border-bottom: 1px solid #E5EAF2;
      padding: 0 28px; height: 68px;
      display: flex; align-items: center; justify-content: space-between;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .topbar-left { display: flex; align-items: center; gap: 14px; }
    .page-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: var(--color-primary);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .page-icon svg { width: 20px; height: 20px; stroke: white; }
    .page-title { font-size: 17px; font-weight: 700; color: #111827; line-height: 1.2; }
    .page-sub { font-size: 12px; color: #6B7280; margin-top: 1px; text-transform: capitalize; }
    .topbar-right { display: flex; align-items: center; gap: 12px; }
    .litiges-alert {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25);
      color: #DC2626; font-size: 12.5px; font-weight: 600;
      padding: 6px 12px; border-radius: 8px; text-decoration: none;
      transition: background 0.15s;
    }
    .litiges-alert:hover { background: rgba(239,68,68,0.14); }
    .litiges-alert svg { width: 14px; height: 14px; }
    .topbar-avatar {
      width: 38px; height: 38px; border-radius: 10px;
      background: var(--color-accent); color: var(--color-primary-dark);
      font-weight: 700; font-size: 13px;
      display: flex; align-items: center; justify-content: center;
    }
    .topbar-name { font-size: 13px; font-weight: 600; color: #111827; line-height: 1.3; }
    .topbar-role { font-size: 11px; color: #6B7280; }

    /* ── Corps ── */
    .admin-body { padding: 24px 28px; display: flex; flex-direction: column; gap: 20px; }

    /* ── Bannière ── */
    .greeting-banner {
      position: relative; overflow: hidden;
      background: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%);
      border-radius: 20px; padding: 28px 32px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .gb-dots { position: absolute; inset: 0; pointer-events: none; }
    .gd { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: rgba(201,152,46,0.55); }
    .gd-1 { top: 20%; right: 30%; } .gd-2 { top: 55%; right: 14%; } .gd-3 { top: 35%; right: 22%; }
    .gd-4 { top: 75%; right: 34%; } .gd-5 { top: 15%; right: 42%; }
    .gb-content { position: relative; z-index: 1; }
    .greeting-hello { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.65); margin-bottom: 4px; }
    .greeting-title { font-size: 21px; font-weight: 700; color: white; }
    .greeting-sub { font-size: 13px; color: rgba(255,255,255,0.7); margin-top: 4px; }
    .btn-accent {
      position: relative; z-index: 1;
      display: inline-flex; align-items: center; gap: 8px;
      background: var(--color-accent); color: var(--color-primary-dark);
      font-size: 13px; font-weight: 700; padding: 11px 20px;
      border-radius: 10px; text-decoration: none; white-space: nowrap; flex-shrink: 0;
      transition: opacity 0.15s;
    }
    .btn-accent:hover { opacity: 0.88; }
    .btn-accent svg { width: 16px; height: 16px; }

    /* ── KPI ── */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .kpi-card {
      background: white; border-radius: 18px; padding: 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #E5EAF2;
      border-top: 3px solid transparent;
      transition: box-shadow 0.15s, transform 0.15s;
    }
    .kpi-card:hover { box-shadow: 0 10px 28px rgba(0,0,0,0.1); transform: translateY(-2px); }
    .kpi-blue { border-top-color: var(--color-primary); }
    .kpi-green { border-top-color: #10B981; }
    .kpi-gold { border-top-color: var(--color-accent); }
    .kpi-red { border-top-color: #EF4444; }
    .kpi-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .kpi-icon {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .kpi-icon svg { width: 20px; height: 20px; }
    .kpi-icon-blue { background: rgba(15,76,129,0.1); }
    .kpi-icon-blue svg { stroke: var(--color-primary); }
    .kpi-icon-green { background: rgba(16,185,129,0.1); }
    .kpi-icon-green svg { stroke: #10B981; }
    .kpi-icon-gold { background: rgba(201,152,46,0.12); }
    .kpi-icon-gold svg { stroke: var(--color-accent); }
    .kpi-icon-red { background: rgba(239,68,68,0.1); }
    .kpi-icon-red svg { stroke: #EF4444; }
    .kpi-sparkline { width: 80px; height: 28px; flex-shrink: 0; opacity: 0.85; }
    .kpi-body { flex: 1; min-width: 0; }
    .kpi-label { font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px; }
    .kpi-value { font-size: 27px; font-weight: 800; color: #111827; line-height: 1.1; }
    .kpi-red-val { color: #EF4444; }
    .kpi-sub { font-size: 11.5px; color: #6B7280; margin-top: 6px; }
    .kpi-sub strong { color: #111827; }
    .kpi-trend-up { font-size: 11.5px; color: #10B981; font-weight: 600; margin-top: 6px; }
    .kpi-pills { margin-top: 8px; }
    .pill { font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 20px; }
    .pill-red-link {
      background: rgba(239,68,68,0.1); color: #DC2626;
      text-decoration: none; display: inline-block;
      transition: background 0.15s;
    }
    .pill-red-link:hover { background: rgba(239,68,68,0.18); }
    .occ-bar { width: 100%; height: 6px; background: #E5E7EB; border-radius: 99px; margin: 8px 0 4px; overflow: hidden; }
    .occ-fill { height: 100%; background: #10B981; border-radius: 99px; transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }

    /* ── Section card commune ── */
    .section-card {
      background: white; border-radius: 18px; padding: 20px 24px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #E5EAF2;
    }
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
    .section-title { font-size: 15px; font-weight: 700; color: #111827; }
    .section-tag { font-size: 12px; font-weight: 600; color: var(--color-primary); background: rgba(15,76,129,0.08); padding: 3px 10px; border-radius: 20px; }
    .voir-tout { font-size: 12.5px; color: var(--color-primary); font-weight: 600; text-decoration: none; }
    .voir-tout:hover { text-decoration: underline; }
    .empty-note { font-size: 13px; color: #9CA3AF; padding: 12px 0; }

    /* ── Litiges + Transactions ── */
    .activity-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    .risk-list { display: flex; flex-direction: column; gap: 4px; }
    .risk-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #F3F4F6; }
    .risk-row:last-child { border-bottom: none; }
    .risk-avatar {
      width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; color: white;
    }
    .risk-avatar-haute { background: #EF4444; }
    .risk-avatar-moyenne { background: #F59E0B; }
    .risk-avatar-basse { background: var(--color-primary); }
    .risk-body { flex: 1; min-width: 0; }
    .risk-name { font-size: 13px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .risk-detail { font-size: 11.5px; color: #9CA3AF; margin-top: 1px; }
    .risk-badge { font-size: 10.5px; font-weight: 700; padding: 3px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0; }
    .risk-badge-haute { background: rgba(239,68,68,0.1); color: #DC2626; }
    .risk-badge-moyenne { background: rgba(245,158,11,0.12); color: #B45309; }
    .risk-badge-basse { background: rgba(15,76,129,0.08); color: var(--color-primary); }

    .txn-list { display: flex; flex-direction: column; gap: 4px; }
    .txn-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #F3F4F6; }
    .txn-row:last-child { border-bottom: none; }
    .txn-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .txn-dot-reussie { background: #10B981; }
    .txn-dot-attente { background: #F59E0B; }
    .txn-dot-echouee { background: #EF4444; }
    .txn-body { flex: 1; min-width: 0; }
    .txn-name { font-size: 13px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .txn-detail { font-size: 11.5px; color: #9CA3AF; margin-top: 1px; }
    .txn-right { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
    .txn-statut { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
    .txn-statut-reussie { background: rgba(16,185,129,0.1); color: #059669; }
    .txn-statut-attente { background: rgba(245,158,11,0.12); color: #B45309; }
    .txn-statut-echouee { background: rgba(239,68,68,0.1); color: #DC2626; }

    /* ── Panneaux ── */
    .panels-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }

    /* ── Roles ── */
    .role-list { display: flex; flex-direction: column; gap: 16px; }
    .role-row { display: flex; align-items: flex-start; gap: 12px; }
    .role-icon {
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .role-icon svg { width: 16px; height: 16px; }
    .role-blue { background: rgba(15,76,129,0.1); }
    .role-blue svg { stroke: var(--color-primary); }
    .role-green { background: rgba(16,185,129,0.1); }
    .role-green svg { stroke: #10B981; }
    .role-gold { background: rgba(201,152,46,0.12); }
    .role-gold svg { stroke: var(--color-accent); }
    .role-info { flex: 1; min-width: 0; }
    .role-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .role-name { font-size: 13px; font-weight: 500; color: #374151; }
    .role-count { font-size: 13px; font-weight: 700; color: #111827; }
    .role-bar-bg { height: 6px; background: #E5E7EB; border-radius: 99px; overflow: hidden; }
    .role-bar-fill { height: 100%; border-radius: 99px; transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }
    .bar-blue { background: var(--color-primary); }
    .bar-green { background: #10B981; }
    .bar-gold { background: var(--color-accent); }

    /* ── Villes ── */
    .ville-list { display: flex; flex-direction: column; gap: 12px; }
    .ville-row {}
    .ville-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
    .ville-name-wrap { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #374151; font-weight: 500; }
    .ville-name-wrap svg { width: 12px; height: 12px; stroke: #9CA3AF; flex-shrink: 0; }
    .ville-pct { font-size: 12.5px; font-weight: 700; color: #111827; }
    .ville-bar-bg { height: 6px; background: #E5E7EB; border-radius: 99px; overflow: hidden; }
    .ville-bar-fill { height: 100%; background: var(--color-primary); border-radius: 99px; transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }

    /* ── Commissions ── */
    .commissions-card { display: flex; flex-direction: column; }
    .commission-amount { margin-bottom: 8px; }
    .commission-note { font-size: 12px; color: #9CA3AF; line-height: 1.5; margin-bottom: 16px; }
    .commission-detail { border-top: 1px solid #E5EAF2; padding-top: 14px; display: flex; flex-direction: column; gap: 10px; }
    .comm-detail-row { display: flex; justify-content: space-between; align-items: center; }
    .comm-detail-label { font-size: 12.5px; color: #6B7280; }
    .comm-detail-val { font-size: 13px; font-weight: 700; color: #111827; }
    .comm-taux { color: #10B981; }

    /* ── Responsive ── */
    @media (max-width: 1200px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .panels-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 900px) {
      .activity-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .admin-body { padding: 16px; }
      .topbar { padding: 0 16px; }
      .topbar-user-info { display: none; }
      .greeting-banner { flex-direction: column; align-items: flex-start; gap: 16px; }
      .panels-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .kpi-grid { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  stats: StatistiquesPlateforme | null = null;
  litigesRecents: Litige[] = [];
  transactionsRecentes: TransactionSupervisee[] = [];
  loading = true;
  loadingActivity = true;
  dateCourante = '';
  nomAdmin = 'Administrateur';
  prenomAdmin = 'Administrateur';
  initiales = 'AD';

  constructor(private adminService: AdminService, private auth: AuthService) {}

  ngOnInit(): void {
    this.dateCourante = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const user = this.auth.getCurrentUser();
    if (user) {
      this.nomAdmin = `${user.firstName} ${user.lastName}`;
      this.prenomAdmin = user.firstName;
      this.initiales = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    this.adminService.getStatistiques().subscribe(s => {
      this.stats = s;
      this.loading = false;
    });
    this.adminService.getLitiges().subscribe(litiges => {
      this.litigesRecents = litiges.filter(l => l.statut === 'OUVERT' || l.statut === 'EN_COURS').slice(0, 4);
      this.loadingActivity = false;
    });
    this.adminService.getTransactions().subscribe(transactions => {
      this.transactionsRecentes = transactions.slice(0, 4);
    });
  }

  // Convertit une petite série de valeurs en points SVG pour une mini-courbe
  // de tendance — purement décoratif tant que l'admin tourne sur des
  // données mock (aucun historique réel à tracer).
  sparkline(values: number[]): string {
    const w = 80, h = 28, max = Math.max(...values), min = Math.min(...values);
    const range = max - min || 1;
    return values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  initialesOf(nom: string): string {
    return nom.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase();
  }

  avatarClass(p: PrioriteLitige): string {
    return 'risk-avatar-' + p.toLowerCase();
  }

  badgeClass(p: PrioriteLitige): string {
    return 'risk-badge-' + p.toLowerCase();
  }

  prioriteLabel(p: PrioriteLitige): string {
    return p === PrioriteLitige.HAUTE ? 'Haute' : p === PrioriteLitige.MOYENNE ? 'Moyenne' : 'Basse';
  }

  dotClass(s: StatutTransaction): string {
    if (s === StatutTransaction.REUSSIE) return 'txn-dot-reussie';
    if (s === StatutTransaction.EN_ATTENTE) return 'txn-dot-attente';
    return 'txn-dot-echouee';
  }

  statutClass(s: StatutTransaction): string {
    if (s === StatutTransaction.REUSSIE) return 'txn-statut-reussie';
    if (s === StatutTransaction.EN_ATTENTE) return 'txn-statut-attente';
    return 'txn-statut-echouee';
  }

  statutLabel(s: StatutTransaction): string {
    if (s === StatutTransaction.REUSSIE) return 'Réussie';
    if (s === StatutTransaction.EN_ATTENTE) return 'En attente';
    return 'Échouée';
  }

  modeLabel(mode: 'T_MONEY' | 'FLOOZ' | 'ESPECES'): string {
    return mode === 'T_MONEY' ? 'T-Money' : mode === 'FLOOZ' ? 'Flooz' : 'Espèces';
  }
}

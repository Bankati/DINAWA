import { Component, OnInit, OnDestroy, ViewChild, ElementRef, signal, PLATFORM_ID, inject, effect } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Annonce, TypeAnnonce, StatutAnnonce } from '@core/models/annonce.model';
import { AnnoncesService } from '../../services/annonces.service';
import { catchError, of } from 'rxjs';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';
import { PublicFooterComponent } from '../../../../shared/components/public-footer/public-footer.component';

const MOCK: Annonce[] = [
  { id: '1', titre: 'Villa moderne avec jardin', description: 'Magnifique villa 5 pièces avec jardin et garage. Quartier calme et sécurisé.', type: TypeAnnonce.LOCATION, typeBien: 'Villa', prix: 350000, adresse: { quartier: 'Adewui', ville: 'Lomé' }, bienId: 'b1', photos: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80'], statut: StatutAnnonce.ACTIVE, dateCreation: new Date('2026-06-01'), dateExpiration: new Date('2026-12-01'), contact: { nom: 'Jean Koffi', telephone: '+228 90 11 22 33', note: 4.8, nombreBiensGeres: 5 } },
  { id: '2', titre: 'Appartement 3 pièces lumineux', description: 'Bel appartement au 3ème étage avec vue dégagée. Cuisine équipée, 2 chambres.', type: TypeAnnonce.LOCATION, typeBien: 'Appartement', prix: 150000, adresse: { quartier: 'Bè', ville: 'Lomé' }, bienId: 'b2', photos: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80'], statut: StatutAnnonce.ACTIVE, dateCreation: new Date('2026-06-10'), dateExpiration: new Date('2026-12-10'), contact: { nom: 'Afi Mensah', telephone: '+228 90 44 55 66', note: 4.5, nombreBiensGeres: 3 } },
  { id: '3', titre: 'Studio meublé Tokoin', description: 'Studio entièrement meublé, idéal étudiant ou professionnel célibataire. Climatisé.', type: TypeAnnonce.LOCATION, typeBien: 'Studio', prix: 75000, adresse: { quartier: 'Tokoin', ville: 'Lomé' }, bienId: 'b3', photos: ['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80'], statut: StatutAnnonce.ACTIVE, dateCreation: new Date('2026-06-15'), dateExpiration: new Date('2026-12-15'), contact: { nom: 'Kofi Amoussou', telephone: '+228 90 77 88 99', note: 4.2, nombreBiensGeres: 8 } },
  { id: '4', titre: 'Maison 4 pièces Nyékonakpoè', description: 'Grande maison avec cour intérieure, idéale pour une famille. Quartier résidentiel.', type: TypeAnnonce.LOCATION, typeBien: 'Maison', prix: 200000, adresse: { quartier: 'Nyékonakpoè', ville: 'Lomé' }, bienId: 'b4', photos: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80'], statut: StatutAnnonce.ACTIVE, dateCreation: new Date('2026-05-20'), dateExpiration: new Date('2026-11-20'), contact: { nom: 'Sœur Ayi', telephone: '+228 91 22 33 44', note: 4.7, nombreBiensGeres: 2 } },
  { id: '5', titre: 'Bureau aménagé centre-ville', description: 'Espace bureau 80m² en open space, 2 salles de réunion. Idéal PME/TPE. Parking.', type: TypeAnnonce.LOCATION, typeBien: 'Bureau', prix: 280000, adresse: { quartier: 'Kodjoviakopé', ville: 'Lomé' }, bienId: 'b5', photos: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80'], statut: StatutAnnonce.ACTIVE, dateCreation: new Date('2026-06-05'), dateExpiration: new Date('2026-12-05'), contact: { nom: 'Ibrahim Touré', telephone: '+228 92 55 66 77', note: 4.9, nombreBiensGeres: 12 } },
  { id: '6', titre: 'Villa de luxe piscine Hédzranawé', description: 'Villa d\'exception 6 pièces avec piscine privée, terrain paysagé. Standing supérieur.', type: TypeAnnonce.LOCATION, typeBien: 'Villa', prix: 650000, adresse: { quartier: 'Hédzranawé', ville: 'Lomé' }, bienId: 'b6', photos: ['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80'], statut: StatutAnnonce.ACTIVE, dateCreation: new Date('2026-06-20'), dateExpiration: new Date('2026-12-20'), contact: { nom: 'Marc Dosseh', telephone: '+228 93 00 11 22', note: 5.0, nombreBiensGeres: 7 } },
  { id: '7', titre: 'Appartement 2 pièces Agoè', description: 'Appartement neuf en résidence sécurisée. Accès gardé 24h, groupe électrogène.', type: TypeAnnonce.LOCATION, typeBien: 'Appartement', prix: 120000, adresse: { quartier: 'Agoè', ville: 'Lomé' }, bienId: 'b7', photos: ['https://images.unsplash.com/photo-1560440021-33f9b867899d?w=800&q=80'], statut: StatutAnnonce.ACTIVE, dateCreation: new Date('2026-07-01'), dateExpiration: new Date('2027-01-01'), contact: { nom: 'Adjoa Sagna', telephone: '+228 94 33 44 55', note: 4.6, nombreBiensGeres: 4 } },
  { id: '8', titre: 'Maison à vendre Kara', description: 'Belle maison 4 pièces, terrain 400m², idéale résidence principale. Vue sur la montagne.', type: TypeAnnonce.VENTE, typeBien: 'Maison', prix: 15000000, adresse: { quartier: 'Centre', ville: 'Kara' }, bienId: 'b8', photos: ['https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80'], statut: StatutAnnonce.ACTIVE, dateCreation: new Date('2026-05-10'), dateExpiration: new Date('2026-11-10'), contact: { nom: 'Yao Djangbé', telephone: '+228 90 88 99 00', note: 4.4, nombreBiensGeres: 2 } },
  { id: '9', titre: 'Studio meublé Adewui', description: 'Studio moderne tout équipé, résidence étudiante. Wi-Fi inclus, gardienné.', type: TypeAnnonce.LOCATION, typeBien: 'Studio', prix: 55000, adresse: { quartier: 'Adewui', ville: 'Lomé' }, bienId: 'b9', photos: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80'], statut: StatutAnnonce.ACTIVE, dateCreation: new Date('2026-07-05'), dateExpiration: new Date('2027-01-05'), contact: { nom: 'Komla Agboka', telephone: '+228 91 66 77 88', note: 4.3, nombreBiensGeres: 15 } },
];

/* Coordonnées GPS des quartiers (Leaflet) */
const COORDS: Record<string, [number, number]> = {
  'Adewui':       [6.165, 1.225],
  'Bè':           [6.127, 1.215],
  'Tokoin':       [6.148, 1.218],
  'Nyékonakpoè':  [6.138, 1.198],
  'Kodjoviakopé': [6.133, 1.180],
  'Hédzranawé':   [6.172, 1.192],
  'Agoè':         [6.193, 1.213],
  'Centre':       [9.551, 1.186],
};

@Component({
  selector: 'app-annonces-public',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LokSkeletonComponent, LokEmptyStateComponent, PublicFooterComponent],
  template: `
<div class="pub-page">

  <!-- ── NAVBAR ── -->
  <nav class="nav" [class.nav-solid]="navScrolled()">
    <div class="nav-inner">
      <a routerLink="/" class="nav-logo">
        <img src="/assets/WARAH-logo.png" alt="WARAH" class="logo-img">
      </a>
      <ul class="nav-links">
        <li><a routerLink="/" class="nl">Accueil</a></li>
        <li><a routerLink="/annonces" class="nl nl-active">Annonces</a></li>
        <li><a routerLink="/a-propos" class="nl">À propos</a></li>
        <li><a href="/#tarifs" class="nl">Tarifs</a></li>
      </ul>
      <div class="nav-cta">
        <a routerLink="/auth/login" class="btn-ghost">Connexion</a>
        <a routerLink="/auth/register" class="btn-nav-primary">S'inscrire</a>
      </div>
      <button class="hamburger" (click)="menuOpen.set(!menuOpen())" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>
    @if (menuOpen()) {
      <div class="m-menu" (click)="menuOpen.set(false)">
        <a routerLink="/" class="mm-link">Accueil</a>
        <a routerLink="/annonces" class="mm-link">Annonces</a>
        <a routerLink="/a-propos" class="mm-link">À propos</a>
        <a href="/#tarifs" class="mm-link">Tarifs</a>
        <div class="mm-sep"></div>
        <a routerLink="/auth/login" class="mm-link">Connexion</a>
        <a routerLink="/auth/register" class="mm-cta">S'inscrire gratuitement</a>
      </div>
    }
  </nav>

  <!-- ── HERO ── -->
  <section class="hero">
    <img
      src="/assets/happy-man-with-house.jpg.jpeg"
      alt="Immobilier Lomé Togo"
      class="hero-bg"
      style="object-position: center top;">
    <div class="hero-ov"></div>
    <!-- Décor lumineux -->
    <div class="hero-deco" aria-hidden="true">
      <div class="hd-orb hd-o1"></div>
      <div class="hd-orb hd-o2"></div>
      <div class="hd-grid"></div>
    </div>
    <div class="hero-content">

      <!-- ── Colonne gauche ── -->
      <div class="hero-left">
        <div class="hero-badge">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 1l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 10.8l-3.8 2-.7-4.3-3.1-3 4.3-.6z"/></svg>
          Annonces vérifiées · Lomé, Togo
        </div>
        <h1 class="hero-title">Trouvez votre<br><span class="hero-accent">logement idéal</span><br>au Togo</h1>
        <p class="hero-sub">Villas, appartements, studios — gérés en toute transparence sur WARAH</p>

        <!-- Chips catégories rapides -->
        <div class="hero-cats">
          <button class="hcat" [class.hcat-on]="typeFilter === ''" (click)="quickCat('')">Tous</button>
          <button class="hcat" [class.hcat-on]="typeFilter === 'Villa'" (click)="quickCat('Villa')">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M1 6.5L7 1l6 5.5V13H9v-3H5v3H1z"/></svg>
            Villa
          </button>
          <button class="hcat" [class.hcat-on]="typeFilter === 'Appartement'" (click)="quickCat('Appartement')">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="2" y="1" width="10" height="12" rx="1"/><line x1="5" y1="4" x2="9" y2="4"/><line x1="5" y1="7" x2="9" y2="7"/><line x1="5" y1="10" x2="7" y2="10"/></svg>
            Appartement
          </button>
          <button class="hcat" [class.hcat-on]="typeFilter === 'Studio'" (click)="quickCat('Studio')">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="1" y="3" width="12" height="9" rx="1"/><path d="M5 12V7h4v5"/></svg>
            Studio
          </button>
          <button class="hcat" [class.hcat-on]="typeFilter === 'Bureau'" (click)="quickCat('Bureau')">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="1" y="4" width="12" height="9" rx="1"/><path d="M4 4V2h6v2"/></svg>
            Bureau
          </button>
        </div>

        <!-- Stats -->
        <div class="hero-stats">
          <div class="hstat">
            <span class="hstat-n">{{ allAnnonces().length }}</span>
            <span class="hstat-l">annonces</span>
          </div>
          <div class="hstat-sep"></div>
          <div class="hstat">
            <span class="hstat-n">6</span>
            <span class="hstat-l">villes</span>
          </div>
          <div class="hstat-sep"></div>
          <div class="hstat">
            <span class="hstat-n">500+</span>
            <span class="hstat-l">propriétaires</span>
          </div>
          <div class="hstat-sep"></div>
          <div class="hstat">
            <span class="hstat-n">98%</span>
            <span class="hstat-l">satisfaction</span>
          </div>
        </div>
      </div>

      <!-- ── Colonne droite : preview propriétés ── -->
      <div class="hero-right">
        <!-- Badge compteur -->
        <div class="hp-counter">
          <div class="hp-counter-dot"></div>
          <span>{{ allAnnonces().length }} biens disponibles maintenant</span>
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 7h8M8 4l3 3-3 3"/></svg>
        </div>

        <!-- Cards propriétés flottantes -->
        <div class="hp-stack">
          @if (!loading() && allAnnonces().length > 0) {
            @for (a of allAnnonces().slice(0, 3); track a.id; let i = $index) {
              <article class="hp-card" [class.hp-featured]="i === 0" (click)="viewAnnonce(a.id)">
                <img [src]="a.photos[0]" [alt]="a.titre" class="hp-img">
                <div class="hp-info">
                  <div class="hp-tags">
                    @if (i === 0) { <span class="hp-tag-new">★ À la une</span> }
                    <span class="hp-tag-type">{{ a.typeBien }}</span>
                  </div>
                  <div class="hp-price">{{ a.prix | number:'1.0-0' }} FCFA@if (a.type === 'LOCATION') {<span class="hp-per">/mois</span>}</div>
                  <div class="hp-loc">
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 1a3 3 0 0 1 3 3c0 2.5-3 6-3 6S3 6.5 3 4a3 3 0 0 1 3-3z"/><circle cx="6" cy="4" r="1"/></svg>
                    {{ a.adresse.quartier }}, {{ a.adresse.ville }}
                  </div>
                </div>
                <svg class="hp-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
              </article>
            }
          } @else {
            @for (i of [1,2,3]; track i) {
              <div class="hp-card hp-skel">
                <div class="hps-img"></div>
                <div class="hps-body"><div class="hps-line hps-l1"></div><div class="hps-line hps-l2"></div></div>
              </div>
            }
          }
        </div>

        <!-- Label confiance -->
        <div class="hp-trust">
          <svg viewBox="0 0 14 14" fill="none" stroke="#C9982E" stroke-width="1.6" stroke-linecap="round"><path d="M7 1l1.5 3 3.3.5-2.4 2.3.6 3.3L7 8.5l-3 1.6.6-3.3L2.2 4.5l3.3-.5z"/></svg>
          Propriétaires vérifiés · Paiement sécurisé
        </div>
      </div>

    </div><!-- /hero-content -->
  </section>

  <!-- FILTRE (hors du hero-content pour le positionnement) -->
  <div class="filter-wrap">
    <div class="filter-card">
      <div class="filter-row">
          <div class="fg">
            <label class="fg-label">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l5-7 5 7v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><polyline points="6 16 6 9 10 9 10 16"/></svg>
              Type de bien
            </label>
            <select [(ngModel)]="typeFilter" (ngModelChange)="onFilter()" class="fg-select">
              <option value="">Tous les types</option>
              <option value="Villa">Villa</option>
              <option value="Appartement">Appartement</option>
              <option value="Studio">Studio</option>
              <option value="Maison">Maison</option>
              <option value="Bureau">Bureau</option>
            </select>
          </div>
          <div class="fg-divider"></div>
          <div class="fg">
            <label class="fg-label">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 1C5.2 1 3 3.2 3 6c0 4 5 9 5 9s5-5 5-9c0-2.8-2.2-5-5-5z"/><circle cx="8" cy="6" r="2"/></svg>
              Ville
            </label>
            <select [(ngModel)]="villeFilter" (ngModelChange)="onFilter()" class="fg-select">
              <option value="">Toutes les villes</option>
              <option value="Lomé">Lomé</option>
              <option value="Kara">Kara</option>
              <option value="Sokodé">Sokodé</option>
              <option value="Atakpamé">Atakpamé</option>
              <option value="Kpalimé">Kpalimé</option>
              <option value="Tsévié">Tsévié</option>
            </select>
          </div>
          <div class="fg-divider"></div>
          <div class="fg">
            <label class="fg-label">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M1 7h14"/></svg>
              Budget maximum
            </label>
            <select [(ngModel)]="budgetFilter" (ngModelChange)="onFilter()" class="fg-select">
              <option value="">Tous les budgets</option>
              <option value="75000">— 75 000 FCFA</option>
              <option value="150000">— 150 000 FCFA</option>
              <option value="300000">— 300 000 FCFA</option>
              <option value="500000">— 500 000 FCFA</option>
            </select>
          </div>
          <button class="fg-btn" (click)="onFilter()">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M15 15l3.5 3.5"/></svg>
            Rechercher
          </button>
        </div>
        @if (hasFilters()) {
          <div class="filter-active">
            <span class="fa-count">{{ filtered().length }} résultat{{ filtered().length !== 1 ? 's' : '' }}</span>
            <button class="fa-reset" (click)="clearFilters()">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4L4 12M4 4l8 8"/></svg>
              Effacer les filtres
            </button>
          </div>
        }
      </div>
  </div><!-- /filter-wrap -->

  <!-- ── ANNONCES ── -->
  <section class="listings">

    <!-- Barre outils : compteur + toggle + tri -->
    <div class="listings-head">
      <p class="listings-count">
        @if (!loading()) { {{ filtered().length }} bien{{ filtered().length !== 1 ? 's' : '' }} disponible{{ filtered().length !== 1 ? 's' : '' }} }
        @else { Chargement… }
      </p>
      <div class="head-right">
        <!-- Toggle Liste / Carte -->
        <div class="view-toggle">
          <button class="vt-btn" [class.vt-on]="viewMode()==='liste'" (click)="setView('liste')">
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="2" y1="4" x2="16" y2="4"/><line x1="2" y1="9" x2="16" y2="9"/><line x1="2" y1="14" x2="16" y2="14"/></svg>
            Liste
          </button>
          <button class="vt-btn" [class.vt-on]="viewMode()==='carte'" (click)="setView('carte')">
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4l5-2.5 6 2.5 5-2.5v13l-5 2.5-6-2.5-5 2.5z"/><line x1="6" y1="1.5" x2="6" y2="17.5"/><line x1="12" y1="4" x2="12" y2="19.5"/></svg>
            Carte
          </button>
        </div>
        <select class="sort-select" [(ngModel)]="sortOrder" (ngModelChange)="onFilter()">
          <option value="recent">Plus récents</option>
          <option value="prix_asc">Prix croissant</option>
          <option value="prix_desc">Prix décroissant</option>
        </select>
      </div>
    </div>

    <!-- ── VUE LISTE ── -->
    @if (viewMode() === 'liste') {
      @if (loading()) {
        <div class="ann-grid">
          @for (i of [1,2,3,4,5,6,7,8,9]; track i) {
            <lok-skeleton type="card"></lok-skeleton>
          }
        </div>
      } @else if (filtered().length === 0) {
        <lok-empty-state
          titre="Aucun bien trouvé"
          description="Aucune annonce ne correspond à vos critères de recherche."
          ctaLabel="Effacer les filtres"
          icon="default"
          (ctaAction)="clearFilters()"
        ></lok-empty-state>
      } @else {
        <div class="ann-grid">
          @for (a of filtered(); track a.id) {
            <article class="ann-card" (click)="viewAnnonce(a.id)" tabindex="0" role="button">
              <div class="ann-img-wrap">
                <img [src]="a.photos[0]" [alt]="a.titre" class="ann-img" loading="lazy">
                <div class="ann-img-gradient"></div>
                <span class="ann-badge-type" [class.badge-loc]="a.type === 'LOCATION'" [class.badge-vente]="a.type === 'VENTE'">
                  {{ a.type === 'LOCATION' ? 'Location' : 'Vente' }}
                </span>
                @if (a.statut === 'ACTIVE') {
                  <span class="ann-badge-dispo">Disponible</span>
                }
                <div class="ann-price">
                  {{ a.prix | number:'1.0-0' }} FCFA@if (a.type === 'LOCATION') {<small>/mois</small>}
                </div>
              </div>
              <div class="ann-body">
                <div class="ann-meta">
                  @if (a.typeBien) { <span class="ann-chip">{{ a.typeBien }}</span> }
                  <span class="ann-quartier">
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 1a3.5 3.5 0 0 1 3.5 3.5c0 3-3.5 6.5-3.5 6.5S2.5 7.5 2.5 4.5A3.5 3.5 0 0 1 6 1z"/><circle cx="6" cy="4.5" r="1.2"/></svg>
                    {{ a.adresse.quartier }}, {{ a.adresse.ville }}
                  </span>
                </div>
                <h3 class="ann-title">{{ a.titre }}</h3>
                <p class="ann-desc">{{ a.description }}</p>
                <div class="ann-footer">
                  <div class="ann-contact">
                    <div class="ann-avatar">{{ a.contact.nom[0] }}</div>
                    <div class="ann-contact-info">
                      <span class="ann-contact-name">{{ a.contact.nom }}</span>
                      @if (a.contact.note) {
                        <span class="ann-note">★ {{ a.contact.note }}</span>
                      }
                    </div>
                  </div>
                  <button class="ann-cta">Voir le bien →</button>
                </div>
              </div>
            </article>
          }
        </div>
      }
    }

    <!-- ── VUE CARTE ── -->
    @if (viewMode() === 'carte') {
      <div class="carte-view">

        <!-- Carte Leaflet -->
        <div class="carte-left">
          <div #mapEl class="carte-leaflet"></div>

          <!-- Fiche flottante annonce active -->
          @if (activeAnnonce()) {
            <div class="cfc">
              <button class="cfc-close" (click)="activeAnnonce.set(null)" aria-label="Fermer">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 4L4 12M4 4l8 8"/></svg>
              </button>
              <img [src]="activeAnnonce()!.photos[0]" [alt]="activeAnnonce()!.titre" class="cfc-img">
              <div class="cfc-body">
                <div class="cfc-top">
                  <span class="cfc-type" [class.cfc-loc]="activeAnnonce()!.type==='LOCATION'" [class.cfc-vente]="activeAnnonce()!.type==='VENTE'">
                    {{ activeAnnonce()!.type === 'LOCATION' ? 'Location' : 'Vente' }}
                  </span>
                  @if (activeAnnonce()!.typeBien) {
                    <span class="cfc-chip">{{ activeAnnonce()!.typeBien }}</span>
                  }
                </div>
                <div class="cfc-price">
                  {{ activeAnnonce()!.prix | number:'1.0-0' }} FCFA@if (activeAnnonce()!.type === 'LOCATION') {<small>/mois</small>}
                </div>
                <div class="cfc-title">{{ activeAnnonce()!.titre }}</div>
                <div class="cfc-loc">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 1a3.5 3.5 0 0 1 3.5 3.5c0 3-3.5 6.5-3.5 6.5S2.5 7.5 2.5 4.5A3.5 3.5 0 0 1 6 1z"/><circle cx="6" cy="4.5" r="1.2"/></svg>
                  {{ activeAnnonce()!.adresse.quartier }}, {{ activeAnnonce()!.adresse.ville }}
                </div>
                <button class="cfc-btn" (click)="viewAnnonce(activeAnnonce()!.id)">Voir le bien →</button>
              </div>
            </div>
          }
        </div>

        <!-- Sidebar liste -->
        <div class="carte-right">
          @if (filtered().length === 0) {
            <div class="carte-empty">Aucun bien ne correspond aux filtres.</div>
          }
          @for (a of filtered(); track a.id) {
            <article class="sc" [class.sc-on]="activeAnnonce()?.id === a.id" (click)="selectOnMap(a)">
              <img [src]="a.photos[0]" [alt]="a.titre" class="sc-img">
              <div class="sc-body">
                <div class="sc-price">
                  {{ a.prix | number:'1.0-0' }} F@if (a.type === 'LOCATION') {<small>/mois</small>}
                </div>
                <div class="sc-title">{{ a.titre }}</div>
                <div class="sc-loc">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 1a3.5 3.5 0 0 1 3.5 3.5c0 3-3.5 6.5-3.5 6.5S2.5 7.5 2.5 4.5A3.5 3.5 0 0 1 6 1z"/><circle cx="6" cy="4.5" r="1.2"/></svg>
                  {{ a.adresse.quartier }}, {{ a.adresse.ville }}
                </div>
              </div>
            </article>
          }
        </div>

      </div>
    }

  </section>

  <app-public-footer></app-public-footer>

</div>
  `,
  styles: `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .pub-page { min-height: 100vh; background: #f4f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; }

    /* ── NAVBAR ── */
    .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 200; background: white; box-shadow: 0 2px 16px rgba(0,0,0,0.08); transition: box-shadow .35s; }
    .nav.nav-solid { box-shadow: 0 4px 28px rgba(0,0,0,0.13); }
    .nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 80px; display: flex; align-items: center; gap: 32px; }
    .nav-logo { flex-shrink: 0; text-decoration: none; display: flex; align-items: center; }
    .logo-img { height: 54px; width: auto; display: block; }
    .nav-links { display: flex; gap: 28px; flex: 1; list-style: none; padding: 0; margin: 0; }
    .nl { color: #0A2650; font-size: 14.5px; font-weight: 500; transition: color .2s; text-decoration: none; }
    .nl:hover { color: #C9982E; }
    .nl-active { color: #0F4C81; font-weight: 700; border-bottom: 2px solid #C9982E; padding-bottom: 2px; }
    .nav-cta { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
    .btn-ghost { color: #0A2650; font-size: 14px; font-weight: 500; padding: 8px 16px; border-radius: 8px; transition: background .2s; text-decoration: none; }
    .btn-ghost:hover { background: rgba(10,38,80,0.07); }
    .btn-nav-primary { background: #0F4C81; color: #fff; font-size: 14px; font-weight: 700; padding: 9px 20px; border-radius: 8px; transition: background .2s; text-decoration: none; }
    .btn-nav-primary:hover { background: #0A2650; }
    .hamburger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 6px; }
    .hamburger span { display: block; width: 22px; height: 2px; background: #0A2650; border-radius: 2px; }
    .m-menu { background: white; padding: 16px 24px 24px; display: flex; flex-direction: column; gap: 4px; border-top: 1px solid #E5E7EB; box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
    .mm-link { color: #374151; font-size: 15px; padding: 12px 0; border-bottom: 1px solid #F3F4F6; text-decoration: none; display: block; }
    .mm-sep { height: 12px; }
    .mm-cta { margin-top: 8px; background: #C9982E; color: #fff; text-align: center; padding: 13px; border-radius: 8px; font-weight: 700; text-decoration: none; }

    /* ── HERO ── */
    .hero { position: relative; min-height: 580px; display: flex; flex-direction: column; overflow: hidden; }
    .hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 40%; }
    .hero-ov { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(8,30,65,0.97) 0%, rgba(10,38,80,0.93) 45%, rgba(15,76,129,0.88) 100%); }

    /* Décor lumineux */
    .hero-deco { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
    .hd-orb { position: absolute; border-radius: 50%; }
    .hd-o1 { width: 560px; height: 560px; background: radial-gradient(circle, rgba(201,152,46,0.1) 0%, transparent 65%); top: -160px; right: -120px; animation: orbPulse 6s ease-in-out infinite; }
    .hd-o2 { width: 340px; height: 340px; background: radial-gradient(circle, rgba(15,76,129,0.18) 0%, transparent 70%); bottom: 0; left: -80px; }
    .hd-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px); background-size: 48px 48px; }
    @keyframes orbPulse { 0%,100%{ transform:scale(1); opacity:1; } 50%{ transform:scale(1.12); opacity:0.75; } }

    /* Layout 2 colonnes */
    .hero-content { position: relative; z-index: 2; flex: 1; display: flex; align-items: center; gap: 48px; max-width: 1280px; width: 100%; margin: 0 auto; padding: 90px 32px 80px; }
    .hero-left { flex: 1; min-width: 0; }
    .hero-badge { display: inline-flex; align-items: center; gap: 7px; color: rgba(255,255,255,0.65); font-size: 11.5px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; margin-bottom: 18px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.14); padding: 5px 14px; border-radius: 20px; }
    .hero-badge svg { width: 12px; height: 12px; }
    .hero-title { font-size: clamp(26px, 3.2vw, 42px); font-weight: 800; color: white; line-height: 1.15; margin-bottom: 14px; }
    .hero-accent { color: #C9982E; }
    .hero-sub { font-size: 16px; color: rgba(255,255,255,0.65); margin-bottom: 28px; line-height: 1.6; max-width: 440px; }

    /* Chips catégories */
    .hero-cats { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 32px; }
    .hcat { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16); color: rgba(255,255,255,0.75); font-size: 13px; font-weight: 600; padding: 9px 16px; border-radius: 22px; cursor: pointer; transition: all .2s; }
    .hcat svg { width: 13px; height: 13px; flex-shrink: 0; }
    .hcat:hover { background: rgba(255,255,255,0.14); color: white; border-color: rgba(255,255,255,0.3); }
    .hcat-on { background: #C9982E !important; border-color: #C9982E !important; color: white !important; box-shadow: 0 4px 16px rgba(201,152,46,0.4); }

    /* Stats */
    .hero-stats { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
    .hstat { display: flex; flex-direction: column; gap: 2px; }
    .hstat-n { font-size: 22px; font-weight: 800; color: white; line-height: 1; }
    .hstat-l { font-size: 10.5px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: .05em; }
    .hstat-sep { width: 1px; height: 30px; background: rgba(255,255,255,0.15); }

    /* Colonne droite — property preview cards */
    .hero-right { flex: 0 0 320px; display: flex; flex-direction: column; gap: 8px; }
    .hp-counter { display: flex; align-items: center; gap: 8px; background: rgba(201,152,46,0.12); border: 1px solid rgba(201,152,46,0.28); color: rgba(255,255,255,0.85); font-size: 12.5px; font-weight: 600; padding: 9px 14px; border-radius: 10px; margin-bottom: 4px; }
    .hp-counter svg { width: 13px; height: 13px; flex-shrink: 0; opacity: 0.7; }
    .hp-counter-dot { width: 7px; height: 7px; border-radius: 50%; background: #C9982E; box-shadow: 0 0 8px rgba(201,152,46,0.8); flex-shrink: 0; animation: dotBlink 1.6s ease-in-out infinite; }
    @keyframes dotBlink { 0%,100%{ opacity:1; } 50%{ opacity:0.3; } }
    .hp-stack { display: flex; flex-direction: column; gap: 9px; }
    .hp-card { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.09); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.14); border-radius: 14px; padding: 11px 12px; cursor: pointer; transition: background .2s, transform .2s, border-color .2s; }
    .hp-card:hover { background: rgba(255,255,255,0.16); transform: translateX(4px); border-color: rgba(201,152,46,0.4); }
    .hp-featured { background: rgba(255,255,255,0.13); border-color: rgba(201,152,46,0.3); }
    .hp-img { width: 64px; height: 54px; border-radius: 9px; object-fit: cover; flex-shrink: 0; }
    .hp-info { flex: 1; min-width: 0; }
    .hp-tags { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
    .hp-tag-new { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #C9982E; background: rgba(201,152,46,0.15); padding: 2px 7px; border-radius: 20px; }
    .hp-tag-type { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: rgba(255,255,255,0.55); }
    .hp-price { font-size: 14.5px; font-weight: 800; color: white; white-space: nowrap; }
    .hp-per { font-size: 10px; font-weight: 500; opacity: 0.55; margin-left: 1px; }
    .hp-loc { display: flex; align-items: center; gap: 4px; font-size: 11px; color: rgba(255,255,255,0.48); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hp-loc svg { width: 10px; height: 10px; flex-shrink: 0; }
    .hp-arrow { width: 16px; height: 16px; flex-shrink: 0; opacity: 0; transition: opacity .2s; color: rgba(255,255,255,0.5); }
    .hp-card:hover .hp-arrow { opacity: 1; }
    /* Skeleton */
    .hp-skel { pointer-events: none; }
    .hps-img { width: 64px; height: 54px; border-radius: 9px; background: rgba(255,255,255,0.1); }
    .hps-body { flex: 1; display: flex; flex-direction: column; gap: 8px; }
    .hps-line { height: 10px; border-radius: 5px; background: rgba(255,255,255,0.08); }
    .hps-l1 { width: 80%; }
    .hps-l2 { width: 55%; }
    .hp-trust { display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(255,255,255,0.4); font-weight: 500; margin-top: 4px; }
    .hp-trust svg { width: 13px; height: 13px; flex-shrink: 0; }

    /* ── FILTER WRAP ── */
    .filter-wrap { max-width: 1200px; margin: -36px auto 0; padding: 0 32px; position: relative; z-index: 10; }
    .filter-card { background: white; border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06); padding: 0; overflow: hidden; }
    .filter-row { display: flex; align-items: stretch; min-height: 76px; }
    .fg { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 5px; padding: 14px 22px; }
    .fg-divider { width: 1px; background: #E5E7EB; flex-shrink: 0; margin: 14px 0; }
    .fg-label { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: .1em; display: flex; align-items: center; gap: 5px; }
    .fg-label svg { width: 11px; height: 11px; }
    .fg-select { border: none; outline: none; font-size: 15px; font-weight: 600; color: #0A2650; background: transparent; cursor: pointer; padding: 0; width: 100%; appearance: none; -webkit-appearance: none; }
    .fg-btn { flex-shrink: 0; background: #0F4C81; color: white; border: none; cursor: pointer; margin: 8px 8px 8px 0; padding: 0 28px; font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; transition: background .2s; border-radius: 12px; }
    .fg-btn:hover { background: #0A2650; }
    .fg-btn svg { width: 16px; height: 16px; }
    .filter-active { display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; background: #EEF4FC; border-top: 1px solid #DBEAFE; }
    .fa-count { font-size: 13px; font-weight: 700; color: #0F4C81; }
    .fa-reset { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: #6B7280; background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: background .2s; }
    .fa-reset:hover { background: rgba(15,76,129,0.08); color: #0F4C81; }
    .fa-reset svg { width: 12px; height: 12px; }

    /* ── LISTINGS ── */
    .listings { max-width: 1280px; margin: 0 auto; padding: 48px 32px 60px; }
    .listings-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; gap: 12px; flex-wrap: wrap; }
    .listings-count { font-size: 15px; color: #6B7280; font-weight: 500; }
    .head-right { display: flex; align-items: center; gap: 12px; }
    .sort-select { border: 1px solid #E5E7EB; border-radius: 8px; padding: 8px 14px; font-size: 13px; color: #374151; background: white; cursor: pointer; outline: none; }

    /* Toggle Vue */
    .view-toggle { display: flex; background: #F3F4F6; border-radius: 10px; padding: 3px; gap: 2px; }
    .vt-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; border: none; background: transparent; font-size: 13px; font-weight: 600; color: #6B7280; cursor: pointer; transition: background .2s, color .2s; }
    .vt-btn svg { width: 14px; height: 14px; }
    .vt-on { background: white; color: #0F4C81; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }

    .ann-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }

    /* ── CARD ── */
    .ann-card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.07); transition: transform .25s cubic-bezier(0.34,1.56,0.64,1), box-shadow .25s ease; cursor: pointer; border: 1px solid #E5E7EB; }
    .ann-card:hover { transform: translateY(-6px); box-shadow: 0 20px 48px rgba(15,76,129,0.14); }
    .ann-card:focus { outline: 2px solid #0F4C81; outline-offset: 2px; }
    .ann-img-wrap { position: relative; height: 220px; overflow: hidden; }
    .ann-img { width: 100%; height: 100%; object-fit: cover; transition: transform .4s ease; }
    .ann-card:hover .ann-img { transform: scale(1.06); }
    .ann-img-gradient { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,38,80,0.75) 0%, transparent 55%); }
    .ann-badge-type { position: absolute; top: 12px; left: 12px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; padding: 4px 10px; border-radius: 20px; }
    .badge-loc { background: rgba(15,76,129,0.92); color: white; }
    .badge-vente { background: rgba(10,38,80,0.92); color: white; }
    .ann-badge-dispo { position: absolute; top: 12px; right: 12px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; padding: 4px 10px; border-radius: 20px; background: rgba(255,255,255,0.2); backdrop-filter: blur(4px); color: white; border: 1px solid rgba(255,255,255,0.4); }
    .ann-price { position: absolute; bottom: 12px; left: 12px; font-size: 17px; font-weight: 800; color: white; }
    .ann-price small { font-size: 11px; font-weight: 500; opacity: 0.75; }
    .ann-body { padding: 16px 18px 18px; }
    .ann-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
    .ann-chip { font-size: 11px; font-weight: 700; color: #0F4C81; background: #EEF4FC; padding: 3px 10px; border-radius: 20px; }
    .ann-quartier { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #9CA3AF; }
    .ann-quartier svg { width: 11px; height: 11px; flex-shrink: 0; }
    .ann-title { font-size: 15px; font-weight: 700; color: #0A2650; margin-bottom: 6px; line-height: 1.3; }
    .ann-desc { font-size: 12.5px; color: #6B7280; line-height: 1.6; margin-bottom: 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .ann-footer { display: flex; align-items: center; justify-content: space-between; }
    .ann-contact { display: flex; align-items: center; gap: 8px; }
    .ann-avatar { width: 32px; height: 32px; border-radius: 8px; background: #0F4C81; color: white; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ann-contact-name { display: block; font-size: 12px; font-weight: 600; color: #374151; }
    .ann-note { display: block; font-size: 11px; color: #9CA3AF; }
    .ann-cta { background: #0F4C81; color: white; border: none; border-radius: 8px; padding: 9px 16px; font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background .2s; }
    .ann-cta:hover { background: #0A2650; }

    /* ── VUE CARTE ── */
    .carte-view { display: flex; height: calc(100vh - 200px); min-height: 580px; border-radius: 16px; overflow: hidden; border: 1px solid #E5E7EB; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .carte-left { flex: 1; position: relative; min-width: 0; }
    .carte-leaflet { width: 100%; height: 100%; }

    /* Fiche flottante */
    .cfc { position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%); width: 320px; background: white; border-radius: 18px; box-shadow: 0 24px 56px rgba(0,0,0,0.22); z-index: 1000; overflow: hidden; }
    .cfc-close { position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.95); border: 1px solid #E5E7EB; border-radius: 8px; cursor: pointer; padding: 0; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; z-index: 2; transition: background .15s; }
    .cfc-close:hover { background: #f3f4f6; }
    .cfc-close svg { width: 12px; height: 12px; stroke: #374151; }
    .cfc-img { width: 100%; height: 150px; object-fit: cover; display: block; }
    .cfc-body { padding: 14px 16px; }
    .cfc-top { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
    .cfc-type { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; padding: 3px 8px; border-radius: 20px; }
    .cfc-loc { background: rgba(15,76,129,0.1); color: #0F4C81; }
    .cfc-vente { background: rgba(10,38,80,0.1); color: #0A2650; }
    .cfc-chip { font-size: 10px; font-weight: 700; color: #6B7280; background: #F3F4F6; padding: 3px 8px; border-radius: 20px; }
    .cfc-price { font-size: 19px; font-weight: 800; color: #0A2650; margin-bottom: 4px; }
    .cfc-price small { font-size: 11px; font-weight: 500; color: #9CA3AF; }
    .cfc-title { font-size: 13.5px; font-weight: 600; color: #374151; margin-bottom: 6px; line-height: 1.35; }
    .cfc-loc { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #9CA3AF; margin-bottom: 12px; }
    .cfc-loc svg { width: 11px; height: 11px; flex-shrink: 0; stroke: #9CA3AF; }
    .cfc-btn { background: #0F4C81; color: white; border: none; border-radius: 10px; padding: 11px 20px; font-size: 13px; font-weight: 700; cursor: pointer; width: 100%; transition: background .2s; }
    .cfc-btn:hover { background: #0A2650; }

    /* Sidebar */
    .carte-right { width: 340px; flex-shrink: 0; overflow-y: auto; background: #f8f9fc; border-left: 1px solid #E5E7EB; display: flex; flex-direction: column; }
    .carte-empty { padding: 32px 20px; text-align: center; color: #9CA3AF; font-size: 14px; }
    .sc { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: white; cursor: pointer; border-bottom: 1px solid #F3F4F6; border-left: 3px solid transparent; transition: background .15s, border-color .15s; }
    .sc:hover { background: #EEF4FC; }
    .sc-on { border-left-color: #0F4C81; background: #EEF4FC; }
    .sc-img { width: 78px; height: 68px; border-radius: 10px; object-fit: cover; flex-shrink: 0; }
    .sc-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .sc-price { font-size: 13.5px; font-weight: 800; color: #0A2650; white-space: nowrap; }
    .sc-price small { font-size: 10px; font-weight: 500; color: #9CA3AF; }
    .sc-title { font-size: 12px; font-weight: 600; color: #374151; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sc-loc { display: flex; align-items: center; gap: 3px; font-size: 11px; color: #9CA3AF; }
    .sc-loc svg { width: 10px; height: 10px; flex-shrink: 0; }

    /* ── RESPONSIVE ── */
    @media (max-width: 1024px) { .ann-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 900px) {
      .carte-right { width: 280px; }
    }
    @media (max-width: 1024px) {
      .hero-right { flex: 0 0 300px; }
    }
    @media (max-width: 900px) {
      .hero-right { display: none; }
      .hero-content { padding: 90px 24px 80px; }
      .carte-right { width: 280px; }
    }
    @media (max-width: 768px) {
      .nav-links, .nav-cta { display: none; }
      .hamburger { display: flex; }
      .hero { min-height: 500px; }
      .hero-content { padding: 80px 20px 70px; }
      .hero-title { font-size: 28px; }
      .hero-cats { gap: 6px; }
      .hcat { font-size: 12px; padding: 7px 12px; }
      .filter-wrap { margin: -24px 0 0; padding: 0 16px; }
      .filter-card { border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); }
      .filter-row { flex-direction: column; min-height: unset; }
      .fg-divider { width: auto; height: 1px; margin: 0 20px; }
      .fg-btn { border-radius: 8px; margin: 8px 12px 12px; padding: 14px; justify-content: center; }
      .listings { padding: 24px 20px 48px; }
      .ann-grid { grid-template-columns: 1fr; }
      .hstat-sep { display: none; }
      .carte-view { flex-direction: column; height: auto; }
      .carte-left { height: 55vw; min-height: 300px; }
      .carte-right { width: 100%; max-height: 360px; }
      .cfc { width: calc(100% - 32px); bottom: 12px; }
    }
  `
})
export class AnnoncesPublicComponent implements OnInit, OnDestroy {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private scrollFn?: () => void;
  private leafletMap?: any;

  loading       = signal(true);
  navScrolled   = signal(false);
  menuOpen      = signal(false);
  viewMode      = signal<'liste' | 'carte'>('liste');
  activeAnnonce = signal<Annonce | null>(null);
  typeFilter    = '';
  villeFilter   = '';
  budgetFilter  = '';
  sortOrder     = 'recent';

  allAnnonces   = signal<Annonce[]>([]);
  filtered      = signal<Annonce[]>([]);

  @ViewChild('mapEl') mapElRef?: ElementRef<HTMLDivElement>;

  constructor(
    private readonly annoncesService: AnnoncesService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly titleService: Title,
    private readonly metaService: Meta,
  ) {
    effect(() => {
      const mode = this.viewMode();
      if (mode === 'carte' && this.isBrowser) {
        setTimeout(() => this.initLeafletMap(), 80);
      } else if (mode === 'liste') {
        this.destroyLeafletMap();
      }
    });
  }

  ngOnInit(): void {
    this.titleService.setTitle('Annonces immobilières au Togo | WARAH');
    this.metaService.updateTag({ name: 'description', content: 'Trouvez villas, appartements et studios à louer ou à vendre au Togo sur WARAH.' });

    if (this.isBrowser) {
      this.scrollFn = () => this.navScrolled.set(window.scrollY > 40);
      window.addEventListener('scroll', this.scrollFn, { passive: true });
    }

    this.route.queryParams.subscribe(p => {
      this.typeFilter  = p['type']  || '';
      this.villeFilter = p['ville'] || '';
      this.loadAnnonces();
    });
  }

  ngOnDestroy(): void {
    if (this.isBrowser && this.scrollFn) {
      window.removeEventListener('scroll', this.scrollFn);
    }
    this.destroyLeafletMap();
  }

  loadAnnonces(): void {
    this.loading.set(true);
    this.annoncesService.getAllAnnonces().pipe(
      catchError(() => of(MOCK))
    ).subscribe(data => {
      const list = data?.length ? data : MOCK;
      this.allAnnonces.set(list);
      this.applyFilters(list);
      this.loading.set(false);
    });
  }

  onFilter(): void { this.applyFilters(this.allAnnonces()); }

  private applyFilters(src: Annonce[]): void {
    let res = [...src];
    if (this.typeFilter)   res = res.filter(a => a.typeBien === this.typeFilter);
    if (this.villeFilter)  res = res.filter(a => a.adresse.ville === this.villeFilter);
    if (this.budgetFilter) res = res.filter(a => a.prix <= +this.budgetFilter);
    if (this.sortOrder === 'prix_asc')  res.sort((a, b) => a.prix - b.prix);
    if (this.sortOrder === 'prix_desc') res.sort((a, b) => b.prix - a.prix);
    this.filtered.set(res);
  }

  quickCat(type: string): void {
    this.typeFilter = type;
    this.applyFilters(this.allAnnonces());
  }

  hasFilters(): boolean { return !!(this.typeFilter || this.villeFilter || this.budgetFilter); }

  clearFilters(): void {
    this.typeFilter = ''; this.villeFilter = ''; this.budgetFilter = '';
    this.applyFilters(this.allAnnonces());
  }

  setView(mode: 'liste' | 'carte'): void {
    this.activeAnnonce.set(null);
    this.viewMode.set(mode);
  }

  selectOnMap(a: Annonce): void {
    this.activeAnnonce.set(a);
    const coords = COORDS[a.adresse.quartier];
    if (coords && this.leafletMap) {
      this.leafletMap.flyTo(coords, 15, { duration: 0.6 });
    }
  }

  viewAnnonce(id: string): void { this.router.navigate(['/annonces', id]); }

  private async initLeafletMap(): Promise<void> {
    if (!this.mapElRef?.nativeElement || this.leafletMap) return;

    const L = await import('leaflet');

    this.leafletMap = L.map(this.mapElRef.nativeElement, {
      center: [6.137, 1.212] as [number, number],
      zoom: 13,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.leafletMap);

    for (const a of this.filtered()) {
      const coords = COORDS[a.adresse.quartier];
      if (!coords) continue;

      const prixFmt = a.prix >= 1_000_000
        ? (a.prix / 1_000_000).toFixed(1).replace('.0', '') + 'M'
        : a.prix >= 1000 ? Math.round(a.prix / 1000) + 'k' : String(a.prix);

      const icon = L.divIcon({
        html: `<button class="map-pin-btn">${prixFmt} F</button>`,
        className: '',
        iconSize: [88, 32] as [number, number],
        iconAnchor: [44, 16] as [number, number],
      });

      L.marker(coords as [number, number], { icon })
        .addTo(this.leafletMap)
        .on('click', () => this.selectOnMap(a));
    }
  }

  private destroyLeafletMap(): void {
    if (this.leafletMap) {
      this.leafletMap.remove();
      this.leafletMap = undefined;
    }
  }
}

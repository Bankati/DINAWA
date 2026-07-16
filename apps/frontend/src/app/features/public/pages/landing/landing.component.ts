import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  template: `
    <div class="landing-page">
      <!-- Barre d'annonce -->
      <div class="announce-bar" id="announceBar">
        <div class="announce-content">
          <span class="announce-badge">Lancement</span>
          <span class="announce-text">Offre de lancement &mdash; 3 mois offerts pour les premiers inscrits</span>
          <a href="/auth/register" class="announce-link">En profiter &rarr;</a>
        </div>
        <button class="announce-close" onclick="document.getElementById('announceBar').style.display='none'">&times;</button>
      </div>

      <!-- Navbar -->
      <nav class="navbar" id="navbar">
        <div class="navbar-container">

          <!-- Logo -->
          <a href="/" class="navbar-logo">
            <img src="/assets/WARAH-logo.png" alt="WARAH" class="logo-img">
          </a>

          <!-- Navigation principale (desktop) -->
          <div class="navbar-nav">
            <a href="/annonces" class="nav-link-item">Annonces</a>
            <a href="/abonnements" class="nav-link-item">Tarifs</a>

            <div class="nav-dropdown">
              <button class="nav-link-item nav-dropdown-trigger">
                Solutions
                <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div class="nav-dropdown-panel">
                <a href="/auth/register?role=proprietaire" class="dropdown-item">
                  <div class="dropdown-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                  </div>
                  <div>
                    <div class="dropdown-item-title">Propri&#233;taires</div>
                    <div class="dropdown-item-desc">G&#233;rez vos biens, encaissez vos loyers</div>
                  </div>
                </a>
                <a href="/auth/register?role=gestionnaire" class="dropdown-item">
                  <div class="dropdown-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                  </div>
                  <div>
                    <div class="dropdown-item-title">Gestionnaires</div>
                    <div class="dropdown-item-desc">Pilotez un portefeuille multi-mandants</div>
                  </div>
                </a>
                <a href="/annonces" class="dropdown-item">
                  <div class="dropdown-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                  <div>
                    <div class="dropdown-item-title">Locataires</div>
                    <div class="dropdown-item-desc">Trouvez votre logement id&#233;al au Togo</div>
                  </div>
                </a>
              </div>
            </div>

            <a href="#contact" class="nav-link-item">Contact</a>
          </div>

          <!-- Boutons d'action (desktop) -->
          <div class="navbar-actions">
            <a href="/auth/login" class="nav-action-link">Connexion</a>
            <a href="/auth/register" class="nav-btn-outline">S&#39;inscrire</a>
            <a href="/annonces/new" class="nav-btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              D&#233;poser une annonce
            </a>
          </div>

          <!-- Bouton menu mobile -->
          <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Menu mobile -->
        <div class="mobile-menu" id="mobileMenu">
          <a href="/annonces" class="mobile-menu-item">Annonces</a>
          <a href="/abonnements" class="mobile-menu-item">Tarifs</a>
          <a href="/auth/register?role=proprietaire" class="mobile-menu-item">Propri&#233;taires</a>
          <a href="/auth/register?role=gestionnaire" class="mobile-menu-item">Gestionnaires</a>
          <div class="mobile-menu-divider"></div>
          <a href="/auth/login" class="mobile-menu-item">Connexion</a>
          <a href="/auth/register" class="mobile-menu-item mobile-menu-cta">S&#39;inscrire gratuitement</a>
          <a href="/annonces/new" class="mobile-menu-item mobile-menu-cta-accent">+ D&#233;poser une annonce</a>
        </div>

        <!-- Filtres types de biens -->
        <div class="navbar-filters">
          <a href="/annonces?type=appartement" class="filter-pill active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            Appartement
          </a>
          <a href="/annonces?type=maison" class="filter-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Maison
          </a>
          <a href="/annonces?type=bureau" class="filter-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
              <line x1="9" y1="2" x2="9" y2="22"></line>
              <line x1="15" y1="2" x2="15" y2="22"></line>
              <line x1="4" y1="12" x2="20" y2="12"></line>
            </svg>
            Bureau
          </a>
          <a href="/annonces?type=villa" class="filter-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
              <line x1="9" y1="12" x2="15" y2="12"></line>
            </svg>
            Villa
          </a>
          <a href="/annonces?type=studio" class="filter-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              <path d="M3 9h18"></path>
            </svg>
            Studio
          </a>
        </div>
      </nav>

      <!-- Hero Section -->
      <section class="hero">
        <div class="hero-background">
          <img src="https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" alt="Lomé skyline" class="hero-bg-image">
        </div>
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <h1 class="hero-title">L'immobilier locatif partout au Togo</h1>
          <p class="hero-subtitle">Trouvez votre logement ou gérez vos biens facilement</p>
          
          <!-- Search bar -->
          <div class="hero-search">
            <input type="text" placeholder="Localisation" class="hero-search-input">
            <select class="hero-search-select">
              <option value="">Type</option>
              <option value="appartement">Appartement</option>
              <option value="maison">Maison</option>
              <option value="bureau">Bureau</option>
            </select>
            <input type="text" placeholder="Budget max" class="hero-search-input">
            <button class="hero-search-button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Rechercher
            </button>
          </div>
          
          <!-- Tabs -->
          <div class="hero-tabs">
            <button class="hero-tab active">Louer</button>
            <button class="hero-tab">Acheter</button>
            <button class="hero-tab">Gérer mes biens</button>
          </div>
          
          <!-- Stats -->
          <div class="hero-stats">
            <div class="hero-stat">
              <span class="hero-stat-number">1 200+</span>
              <span class="hero-stat-label">annonces</span>
            </div>
            <div class="hero-stat">
              <span class="hero-stat-number">500+</span>
              <span class="hero-stat-label">propriétaires</span>
            </div>
            <div class="hero-stat">
              <span class="hero-stat-number">50+</span>
              <span class="hero-stat-label">villes</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Recent Listings Section -->
      <section class="listings">
        <div class="section-container">
          <h2 class="section-title">Dernières annonces disponibles</h2>

          <div class="listings-carousel-wrap">
          <div class="listings-grid">
            <!-- Listing 1 -->
            <a href="/annonces/1" class="listing-card">
              <div class="listing-image">
                <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Appartement" class="listing-img">
                <div class="listing-badge">Nouveau</div>
                <div class="listing-price">150 000 FCFA/mois</div>
              </div>
              <div class="listing-content">
                <h3 class="listing-title">Appartement 3 pièces - Lomé</h3>
                <p class="listing-location">Kodjoviakopé, Lomé</p>
                <div class="listing-features">
                  <span class="listing-feature">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    </svg>
                    85 m²
                  </span>
                  <span class="listing-feature">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    3 ch.
                  </span>
                  <span class="listing-feature">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    2 sdb
                  </span>
                </div>
                <button class="btn-outline listing-button">Voir</button>
              </div>
            </a>
            
            <!-- Listing 2 -->
            <a href="/annonces/2" class="listing-card">
              <div class="listing-image">
                <img src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Villa" class="listing-img">
                <div class="listing-price">200 000 FCFA/mois</div>
              </div>
              <div class="listing-content">
                <h3 class="listing-title">Villa moderne - Lomé</h3>
                <p class="listing-location">Bè, Lomé</p>
                <div class="listing-features">
                  <span class="listing-feature">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    </svg>
                    150 m²
                  </span>
                  <span class="listing-feature">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    4 ch.
                  </span>
                  <span class="listing-feature">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    3 sdb
                  </span>
                </div>
                <button class="btn-outline listing-button">Voir</button>
              </div>
            </a>
            
            <!-- Listing 3 -->
            <a href="/annonces/3" class="listing-card">
              <div class="listing-image">
                <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Studio" class="listing-img">
                <div class="listing-badge">Nouveau</div>
                <div class="listing-price">80 000 FCFA/mois</div>
              </div>
              <div class="listing-content">
                <h3 class="listing-title">Studio - Lomé</h3>
                <p class="listing-location">Tokoin, Lomé</p>
                <div class="listing-features">
                  <span class="listing-feature">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    </svg>
                    35 m²
                  </span>
                  <span class="listing-feature">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    1 ch.
                  </span>
                  <span class="listing-feature">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    1 sdb
                  </span>
                </div>
                <button class="btn-outline listing-button">Voir</button>
              </div>
            </a>
            
            <!-- Listing 4 -->
            <a href="/annonces/4" class="listing-card">
              <div class="listing-image">
                <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Bureau" class="listing-img">
                <div class="listing-price">300 000 FCFA/mois</div>
              </div>
              <div class="listing-content">
                <h3 class="listing-title">Bureau - Lomé</h3>
                <p class="listing-location">Centenaire, Lomé</p>
                <div class="listing-features">
                  <span class="listing-feature">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    </svg>
                    120 m²
                  </span>
                  <span class="listing-feature">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    5 bureaux
                  </span>
                  <span class="listing-feature">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    2 sdb
                  </span>
                </div>
                <button class="btn-outline listing-button">Voir</button>
              </div>
            </a>

            <!-- Duplication pour le défilement en boucle continue -->
            <a href="/annonces/1" class="listing-card" aria-hidden="true" tabindex="-1">
              <div class="listing-image">
                <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="" class="listing-img">
                <div class="listing-badge">Nouveau</div>
                <div class="listing-price">150 000 FCFA/mois</div>
              </div>
              <div class="listing-content">
                <h3 class="listing-title">Appartement 3 pièces - Lomé</h3>
                <p class="listing-location">Kodjoviakopé, Lomé</p>
                <div class="listing-features">
                  <span class="listing-feature">85 m²</span>
                  <span class="listing-feature">3 ch.</span>
                  <span class="listing-feature">2 sdb</span>
                </div>
                <button class="btn-outline listing-button" tabindex="-1">Voir</button>
              </div>
            </a>
            <a href="/annonces/2" class="listing-card" aria-hidden="true" tabindex="-1">
              <div class="listing-image">
                <img src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="" class="listing-img">
                <div class="listing-price">200 000 FCFA/mois</div>
              </div>
              <div class="listing-content">
                <h3 class="listing-title">Villa moderne - Lomé</h3>
                <p class="listing-location">Bè, Lomé</p>
                <div class="listing-features">
                  <span class="listing-feature">150 m²</span>
                  <span class="listing-feature">4 ch.</span>
                  <span class="listing-feature">3 sdb</span>
                </div>
                <button class="btn-outline listing-button" tabindex="-1">Voir</button>
              </div>
            </a>
            <a href="/annonces/3" class="listing-card" aria-hidden="true" tabindex="-1">
              <div class="listing-image">
                <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="" class="listing-img">
                <div class="listing-badge">Nouveau</div>
                <div class="listing-price">80 000 FCFA/mois</div>
              </div>
              <div class="listing-content">
                <h3 class="listing-title">Studio - Lomé</h3>
                <p class="listing-location">Tokoin, Lomé</p>
                <div class="listing-features">
                  <span class="listing-feature">35 m²</span>
                  <span class="listing-feature">1 ch.</span>
                  <span class="listing-feature">1 sdb</span>
                </div>
                <button class="btn-outline listing-button" tabindex="-1">Voir</button>
              </div>
            </a>
            <a href="/annonces/4" class="listing-card" aria-hidden="true" tabindex="-1">
              <div class="listing-image">
                <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="" class="listing-img">
                <div class="listing-price">300 000 FCFA/mois</div>
              </div>
              <div class="listing-content">
                <h3 class="listing-title">Bureau - Lomé</h3>
                <p class="listing-location">Centenaire, Lomé</p>
                <div class="listing-features">
                  <span class="listing-feature">120 m²</span>
                  <span class="listing-feature">5 bureaux</span>
                  <span class="listing-feature">2 sdb</span>
                </div>
                <button class="btn-outline listing-button" tabindex="-1">Voir</button>
              </div>
            </a>
          </div>
          </div>

          <div class="text-center">
            <a href="/annonces" class="btn-primary">Voir toutes les annonces</a>
          </div>
        </div>
      </section>

      <!-- Categories Section -->
      <section class="categories">
        <div class="section-container">

          <div class="categories-header">
            <span class="categories-eyebrow">Types de biens</span>
            <h2 class="section-title">Rechercher par type de bien</h2>
            <p class="categories-subtitle">Parcourez nos annonces selon le type de logement ou d&#39;espace qui vous correspond au Togo</p>
          </div>

          <div class="categories-grid">

            <a href="/annonces?type=maison" class="category-card cat-maison">
              <div class="cat-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <div class="cat-body">
                <span class="cat-name">Maison</span>
                <span class="cat-badge">320 annonces</span>
              </div>
              <svg class="cat-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </a>

            <a href="/annonces?type=appartement" class="category-card cat-appartement">
              <div class="cat-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
              </div>
              <div class="cat-body">
                <span class="cat-name">Appartement</span>
                <span class="cat-badge">450 annonces</span>
              </div>
              <svg class="cat-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </a>

            <a href="/annonces?type=bureau" class="category-card cat-bureau">
              <div class="cat-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                  <line x1="9" y1="2" x2="9" y2="22"></line>
                  <line x1="15" y1="2" x2="15" y2="22"></line>
                  <line x1="4" y1="12" x2="20" y2="12"></line>
                </svg>
              </div>
              <div class="cat-body">
                <span class="cat-name">Bureau</span>
                <span class="cat-badge">180 annonces</span>
              </div>
              <svg class="cat-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </a>


            <a href="/annonces?type=villa" class="category-card cat-villa">
              <div class="cat-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <path d="M2 22V11L12 3l10 8v11H2z"></path>
                  <path d="M2 22h20"></path>
                  <rect x="5" y="12" width="3" height="4"></rect>
                  <rect x="16" y="12" width="3" height="4"></rect>
                  <path d="M10 22v-6h4v6"></path>
                </svg>
              </div>
              <div class="cat-body">
                <span class="cat-name">Villa</span>
                <span class="cat-badge">100 annonces</span>
              </div>
              <svg class="cat-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </a>

          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="features">
        <div class="section-container">
          <div class="features-layout">

            <div class="features-text">
              <span class="features-eyebrow">Pour propriétaires &amp; gestionnaires</span>
              <h2 class="features-title">Gérez vos biens<br>comme un pro</h2>
              <p class="features-description">Simplifiez la gestion locative avec WARAH. Automatisez les paiements, suivez vos revenus et gagnez du temps au quotidien.</p>

              <div class="features-list">
                <div class="feature-item">
                  <div class="feature-step">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                  </div>
                  <div class="feature-content">
                    <h4 class="feature-title">Gestion centralisée</h4>
                    <p class="feature-desc">Tous vos biens, contrats et locataires depuis un seul tableau de bord</p>
                  </div>
                </div>
                <div class="feature-item">
                  <div class="feature-step">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                      <line x1="12" y1="18" x2="12.01" y2="18"></line>
                    </svg>
                  </div>
                  <div class="feature-content">
                    <h4 class="feature-title">Paiements T-Money &amp; Flooz</h4>
                    <p class="feature-desc">Encaissez vos loyers en ligne et générez des quittances automatiquement</p>
                  </div>
                </div>
                <div class="feature-item">
                  <div class="feature-step">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                      <line x1="18" y1="20" x2="18" y2="10"></line>
                      <line x1="12" y1="20" x2="12" y2="4"></line>
                      <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                  </div>
                  <div class="feature-content">
                    <h4 class="feature-title">Rapports &amp; export PDF</h4>
                    <p class="feature-desc">Suivez vos revenus en temps réel et exportez vos données facilement</p>
                  </div>
                </div>
                <div class="feature-item">
                  <div class="feature-step">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                  </div>
                  <div class="feature-content">
                    <h4 class="feature-title">Rappels automatiques</h4>
                    <p class="feature-desc">Alertes pour loyers impayés, fins de contrat et renouvellements</p>
                  </div>
                </div>
              </div>

              <div class="features-cta">
                <a href="/auth/register" class="btn-features-primary">
                  Déposer mon premier bien gratuitement
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-7-7 7 7-7 7"/>
                  </svg>
                </a>
                <a href="/abonnements" class="btn-features-link">Voir les tarifs →</a>
              </div>
            </div>

            <div class="features-visual">
              <div class="mockup-card">
                <div class="mockup-header">
                  <div class="mockup-dot mockup-dot-red"></div>
                  <div class="mockup-dot mockup-dot-yellow"></div>
                  <div class="mockup-dot mockup-dot-green"></div>
                  <span class="mockup-title-bar">WARAH — Tableau de bord</span>
                </div>
                <div class="mockup-stats">
                  <div class="mockup-stat">
                    <div class="mockup-stat-icon">🏠</div>
                    <div class="mockup-stat-value">8</div>
                    <div class="mockup-stat-label">Biens</div>
                  </div>
                  <div class="mockup-stat">
                    <div class="mockup-stat-icon">👥</div>
                    <div class="mockup-stat-value">12</div>
                    <div class="mockup-stat-label">Locataires</div>
                  </div>
                  <div class="mockup-stat">
                    <div class="mockup-stat-icon">💰</div>
                    <div class="mockup-stat-value">320k</div>
                    <div class="mockup-stat-label">FCFA/mois</div>
                  </div>
                </div>
                <div class="mockup-chart">
                  <div class="mockup-chart-header">
                    <span class="mockup-chart-label">Revenus — Juin 2026</span>
                    <span class="mockup-trend">↑ +12%</span>
                  </div>
                  <div class="mockup-bars">
                    <div class="mockup-bar" style="height:42%"></div>
                    <div class="mockup-bar" style="height:60%"></div>
                    <div class="mockup-bar" style="height:48%"></div>
                    <div class="mockup-bar" style="height:75%"></div>
                    <div class="mockup-bar" style="height:65%"></div>
                    <div class="mockup-bar mockup-bar-accent" style="height:95%"></div>
                  </div>
                  <div class="mockup-chart-footer">
                    <span class="mockup-total">Total : 320 000 FCFA</span>
                  </div>
                </div>
                <div class="mockup-activity">
                  <div class="mockup-activity-item">
                    <div class="mockup-avatar mockup-av-green">KM</div>
                    <div class="mockup-activity-text">
                      <div class="mockup-activity-name">Kofi M. — Appart 3P, Lomé</div>
                      <div class="mockup-activity-sub">Loyer reçu · T-Money · Juin</div>
                    </div>
                    <span class="mockup-badge mockup-badge-paid">Payé</span>
                  </div>
                  <div class="mockup-activity-item">
                    <div class="mockup-avatar mockup-av-orange">AK</div>
                    <div class="mockup-activity-text">
                      <div class="mockup-activity-name">Awa K. — Studio Tokoin</div>
                      <div class="mockup-activity-sub">Rappel envoyé · J+3</div>
                    </div>
                    <span class="mockup-badge mockup-badge-late">En retard</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- Stats Section -->
      <section class="stats">
        <div class="stats-background">
          <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" alt="Architecture" class="stats-bg-image">
        </div>
        <div class="stats-overlay"></div>

        <div class="stats-inner">
          <!-- En-t&#234;te de section -->
          <div class="stats-tagline">
            <span class="stats-eyebrow">WARAH en chiffres</span>
            <h3 class="stats-heading">Des r&#233;sultats concrets, chaque jour</h3>
          </div>

          <!-- Chiffres cl&#233;s -->
          <div class="stats-container">

            <div class="stat-item">
              <div class="stat-icon-top">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <div class="stat-number" data-target="1200">0</div>
              <div class="stat-label">annonces actives</div>
            </div>

            <div class="stats-sep"></div>

            <div class="stat-item">
              <div class="stat-icon-top">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div class="stat-number" data-target="500">0</div>
              <div class="stat-label">propri&#233;taires inscrits</div>
            </div>

            <div class="stats-sep"></div>

            <div class="stat-item">
              <div class="stat-icon-top">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <div class="stat-number" data-target="98">0</div>
              <div class="stat-label">% de satisfaction</div>
            </div>

            <div class="stats-sep"></div>

            <div class="stat-item stat-payment">
              <div class="stat-icon-top">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                  <line x1="12" y1="18" x2="12.01" y2="18"></line>
                </svg>
              </div>
              <div class="payment-badges">
                <span class="payment-badge">T-Money</span>
                <span class="payment-badge">Flooz</span>
              </div>
              <div class="stat-label">paiements mobile accept&#233;s</div>
            </div>

          </div>
        </div>
      </section>

      <!-- Cities Section -->
      <section class="cities">
        <div class="section-container">
          <h2 class="section-title">Rechercher par ville</h2>
          
          <div class="cities-grid">
            <a href="/annonces?ville=lome" class="city-card">
              <div class="city-image">
                <img src="https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Lomé" class="city-img">
              </div>
              <div class="city-content">
                <h3 class="city-name">Lomé</h3>
                <span class="city-count">450 annonces</span>
              </div>
            </a>
            
            <a href="/annonces?ville=kpalime" class="city-card">
              <div class="city-image">
                <img src="https://images.unsplash.com/photo-1559827291-72ee739d0d9a?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Kpalimé" class="city-img">
              </div>
              <div class="city-content">
                <h3 class="city-name">Kpalimé</h3>
                <span class="city-count">120 annonces</span>
              </div>
            </a>
            
            <a href="/annonces?ville=atakpame" class="city-card">
              <div class="city-image">
                <img src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Atakpamé" class="city-img">
              </div>
              <div class="city-content">
                <h3 class="city-name">Atakpamé</h3>
                <span class="city-count">90 annonces</span>
              </div>
            </a>
            
            <a href="/annonces?ville=sokode" class="city-card">
              <div class="city-image">
                <img src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Sokodé" class="city-img">
              </div>
              <div class="city-content">
                <h3 class="city-name">Sokodé</h3>
                <span class="city-count">75 annonces</span>
              </div>
            </a>
            
            <a href="/annonces?ville=kara" class="city-card">
              <div class="city-image">
                <img src="https://images.unsplash.com/photo-1518391846015-55a9cc003b25?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Kara" class="city-img">
              </div>
              <div class="city-content">
                <h3 class="city-name">Kara</h3>
                <span class="city-count">60 annonces</span>
              </div>
            </a>
            
            <a href="/annonces?ville=tsevie" class="city-card">
              <div class="city-image">
                <img src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Tsévié" class="city-img">
              </div>
              <div class="city-content">
                <h3 class="city-name">Tsévié</h3>
                <span class="city-count">45 annonces</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      <!-- Testimonials Section -->
      <section class="testimonials">
        <div class="section-container">
          <h2 class="section-title">Ce que disent nos utilisateurs</h2>
          
          <div class="testimonials-grid">
            <div class="testimonial-card">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" alt="Kofi Mensah" class="testimonial-avatar">
              <div class="testimonial-rating">
                <svg viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <svg viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <svg viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <svg viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <svg viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </div>
              <p class="testimonial-text">"WARAH a transformé ma gestion locative. Je reçois mes paiements à temps et je peux suivre tout en un clic."</p>
              <h4 class="testimonial-name">Kofi Mensah</h4>
              <span class="testimonial-role">Propriétaire, Lomé</span>
            </div>

            <div class="testimonial-card">
              <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" alt="Awa Koffi" class="testimonial-avatar">
              <div class="testimonial-rating">
                <svg viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <svg viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <svg viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <svg viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <svg viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </div>
              <p class="testimonial-text">"J'ai trouvé mon appartement en 2 jours grâce à WARAH. L'interface est intuitive et les annonces sont de qualité."</p>
              <h4 class="testimonial-name">Awa Koffi</h4>
              <span class="testimonial-role">Locataire, Lomé</span>
            </div>

            <div class="testimonial-card">
              <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" alt="Komlan Agbogba" class="testimonial-avatar">
              <div class="testimonial-rating">
                <svg viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <svg viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <svg viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <svg viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <svg viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </div>
              <p class="testimonial-text">"En tant qu'agent immobilier, WARAH m'aide à gérer le portefeuille de mes clients efficacement. Excellent outil !"</p>
              <h4 class="testimonial-name">Komlan Agbogba</h4>
              <span class="testimonial-role">Agent immobilier, Kpalimé</span>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta">
        <div class="cta-background">
          <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" alt="Immobilier" class="cta-bg-image">
        </div>
        <div class="cta-overlay"></div>
        <div class="cta-container">
          <h2 class="cta-title">Prêt à publier votre annonce ?</h2>
          <p class="cta-subtitle">Rejoignez des centaines de propriétaires et locataires sur WARAH</p>
          <div class="cta-buttons">
            <a href="/auth/register?role=proprietaire" class="btn-primary btn-large">Je suis propriétaire</a>
            <a href="/annonces" class="btn-outline btn-large">Je cherche un logement</a>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="footer">
        <div class="footer-container">
          <div class="footer-section footer-brand">
            <div class="footer-logo">
              <img src="/assets/WARAH-logo.png" alt="WARAH" class="logo-img">
            </div>
            <p class="footer-description">La plateforme immobilière n°1 au Togo. Trouvez votre logement ou gérez vos biens facilement.</p>
            <div class="footer-payment">
              <span class="footer-payment-badge">T-Money</span>
              <span class="footer-payment-badge">Flooz</span>
            </div>
            <div class="footer-social">
              <a href="#" class="social-link" aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
              <a href="#" class="social-link" aria-label="Twitter">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                </svg>
              </a>
              <a href="#" class="social-link" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                  <rect x="2" y="9" width="4" height="12"></rect>
                  <circle cx="4" cy="4" r="2"></circle>
                </svg>
              </a>
              <a href="#" class="social-link" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
            </div>
          </div>
          
          <div class="footer-section">
            <h4 class="footer-title">Liens rapides</h4>
            <a href="/a-propos" class="footer-link">À propos</a>
            <a href="/blog" class="footer-link">Blog</a>
            <a href="/contact" class="footer-link">Contact</a>
            <a href="/faq" class="footer-link">FAQ</a>
          </div>
          
          <div class="footer-section">
            <h4 class="footer-title">Types de biens</h4>
            <a href="/annonces?type=appartement" class="footer-link">Appartements</a>
            <a href="/annonces?type=maison" class="footer-link">Maisons</a>
            <a href="/annonces?type=bureau" class="footer-link">Bureaux</a>
          </div>
          
          <div class="footer-section">
            <h4 class="footer-title">Contact</h4>
            <a href="#" class="footer-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="footer-link-icon">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              Lomé, Togo
            </a>
            <a href="tel:+22890000000" class="footer-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="footer-link-icon">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 2 2 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              +228 90 00 00 00
            </a>
            <a href="mailto:contact@WARAH.tg" class="footer-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="footer-link-icon">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              contact@WARAH.tg
            </a>
          </div>
        </div>
        
        <div class="footer-bottom">
          <p class="footer-copyright">© 2026 WARAH. Tous droits réservés.</p>
          <div class="footer-legal">
            <a href="/mentions-legales" class="footer-legal-link">Mentions légales</a>
            <span class="footer-legal-sep">•</span>
            <a href="/cgu" class="footer-legal-link">CGU</a>
            <span class="footer-legal-sep">•</span>
            <a href="/confidentialite" class="footer-legal-link">Confidentialité</a>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .landing-page {
      min-height: 100vh;
      background: #FFFFFF;
    }

    /* Barre d'annonce */
    .announce-bar {
      background: var(--color-primary);
      color: white;
      padding: 0.625rem 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      font-size: 0.8125rem;
    }

    .announce-content {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .announce-badge {
      background: var(--color-accent);
      color: var(--color-primary-900);
      padding: 0.125rem 0.625rem;
      border-radius: 2rem;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }

    .announce-text {
      color: rgba(255, 255, 255, 0.92);
    }

    .announce-link {
      color: var(--color-accent);
      font-weight: 700;
      text-decoration: none;
      flex-shrink: 0;
      transition: opacity 0.15s;
    }

    .announce-link:hover {
      opacity: 0.8;
    }

    .announce-close {
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 1.25rem;
      cursor: pointer;
      line-height: 1;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      transition: all 0.15s;
    }

    .announce-close:hover {
      color: white;
      background: rgba(255, 255, 255, 0.1);
    }

    /* Navbar */
    .navbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: white;
      border-bottom: 1px solid var(--color-border);
      transition: box-shadow 0.25s ease;
    }

    .navbar.scrolled {
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
    }

    .navbar-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 2rem;
      height: 108px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .navbar-logo {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      text-decoration: none;
    }

    .logo-img {
      height: 92px;
      width: auto;
      object-fit: contain;
      background: transparent !important;
      mix-blend-mode: multiply;
    }

    /* Navigation principale */
    .navbar-nav {
      display: flex;
      align-items: center;
      gap: 0.125rem;
      flex: 1;
      justify-content: center;
    }

    .nav-link-item {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.5rem 0.875rem;
      color: var(--color-text);
      text-decoration: none;
      font-size: 0.9375rem;
      font-weight: 500;
      border-radius: 0.5rem;
      transition: all 0.15s;
      background: none;
      border: none;
      cursor: pointer;
      white-space: nowrap;
      font-family: inherit;
    }

    .nav-link-item:hover {
      background: var(--color-primary-50);
      color: var(--color-primary);
    }

    .dropdown-arrow {
      width: 15px;
      height: 15px;
      transition: transform 0.2s ease;
    }

    /* Dropdown Solutions */
    .nav-dropdown {
      position: relative;
    }

    .nav-dropdown:hover .nav-dropdown-panel,
    .nav-dropdown:focus-within .nav-dropdown-panel {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
      pointer-events: auto;
    }

    .nav-dropdown:hover .dropdown-arrow {
      transform: rotate(180deg);
    }

    .nav-dropdown-panel {
      position: absolute;
      top: calc(100% + 0.75rem);
      left: 50%;
      transform: translateX(-50%) translateY(-6px);
      background: white;
      border: 1px solid var(--color-border);
      border-radius: 1rem;
      padding: 0.5rem;
      min-width: 310px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06);
      opacity: 0;
      pointer-events: none;
      transition: all 0.18s ease;
      z-index: 200;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 0.875rem;
      border-radius: 0.75rem;
      text-decoration: none;
      transition: background 0.12s;
    }

    .dropdown-item:hover {
      background: var(--color-primary-50);
    }

    .dropdown-item-icon {
      width: 42px;
      height: 42px;
      border-radius: 0.625rem;
      background: var(--color-primary-50);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--color-primary);
      transition: background 0.12s;
    }

    .dropdown-item:hover .dropdown-item-icon {
      background: rgba(15, 76, 129, 0.15);
    }

    .dropdown-item-icon svg {
      width: 20px;
      height: 20px;
    }

    .dropdown-item-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 0.125rem;
    }

    .dropdown-item-desc {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      line-height: 1.4;
    }

    /* Boutons d'action */
    .navbar-actions {
      display: flex;
      gap: 0.625rem;
      align-items: center;
      flex-shrink: 0;
    }

    .nav-action-link {
      color: var(--color-text);
      text-decoration: none;
      font-size: 0.9375rem;
      font-weight: 500;
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      transition: all 0.15s;
      white-space: nowrap;
    }

    .nav-action-link:hover {
      background: var(--color-primary-50);
      color: var(--color-primary);
    }

    .nav-btn-outline {
      border: 1.5px solid var(--color-primary);
      color: var(--color-primary);
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 600;
      transition: all 0.15s;
      white-space: nowrap;
    }

    .nav-btn-outline:hover {
      background: var(--color-primary-50);
    }

    .nav-btn-primary {
      background: var(--color-accent);
      color: var(--color-primary-900);
      padding: 0.5625rem 1rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      transition: all 0.15s;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.25);
    }

    .nav-btn-primary svg {
      width: 16px;
      height: 16px;
    }

    .nav-btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(245, 158, 11, 0.35);
    }

    /* Menu mobile */
    .mobile-menu-btn {
      display: none;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      color: var(--color-text);
      border-radius: 0.5rem;
      transition: background 0.15s;
    }

    .mobile-menu-btn:hover {
      background: var(--color-primary-50);
    }

    .mobile-menu-btn svg {
      width: 24px;
      height: 24px;
    }

    .mobile-menu {
      display: none;
      flex-direction: column;
      border-top: 1px solid var(--color-border);
      padding: 0.75rem;
      background: white;
    }

    .mobile-menu.open {
      display: flex;
    }

    .mobile-menu-item {
      padding: 0.75rem 1rem;
      color: var(--color-text);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9375rem;
      border-radius: 0.5rem;
      transition: background 0.12s;
    }

    .mobile-menu-item:hover {
      background: var(--color-primary-50);
      color: var(--color-primary);
    }

    .mobile-menu-divider {
      height: 1px;
      background: var(--color-border);
      margin: 0.5rem 0;
    }

    .mobile-menu-cta {
      background: var(--color-primary-50);
      color: var(--color-primary);
      font-weight: 600;
      margin-top: 0.25rem;
    }

    .mobile-menu-cta-accent {
      background: var(--color-accent);
      color: var(--color-primary-900);
      font-weight: 700;
      text-align: center;
      margin-top: 0.375rem;
    }

    /* Filtres types de biens */
    .navbar-filters {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0.625rem 2rem 0.875rem;
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      scrollbar-width: none;
      border-top: 1px solid var(--color-border);
    }

    .navbar-filters::-webkit-scrollbar {
      display: none;
    }

    .filter-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.4375rem 0.875rem;
      border: 1.5px solid var(--color-border);
      border-radius: 2rem;
      background: white;
      color: var(--color-text-muted);
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
      text-decoration: none;
    }

    .filter-pill svg {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    .filter-pill:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: var(--color-primary-50);
    }

    .filter-pill.active {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
      box-shadow: 0 2px 8px rgba(15, 76, 129, 0.22);
    }

    /* Buttons */
    .btn-primary {
      background: var(--color-accent);
      color: var(--color-primary);
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
      border: none;
      cursor: pointer;
    }

    .btn-primary:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(245, 166, 35, 0.3);
    }

    .btn-accent {
      background: var(--color-accent);
      color: var(--color-primary-900);
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9375rem;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s;
      border: none;
      cursor: pointer;
    }

    .btn-accent svg {
      width: 18px;
      height: 18px;
    }

    .btn-accent:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
    }

    .btn-outline {
      border: 1.5px solid var(--color-primary);
      color: var(--color-primary);
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9375rem;
      transition: all 0.2s;
      background: transparent;
      cursor: pointer;
    }

    .btn-outline:hover {
      background: var(--color-primary-50);
    }

    .btn-large {
      padding: 1rem 2rem;
      font-size: 1.125rem;
    }

    /* Hero Section */
    .hero {
      position: relative;
      padding: 3.5rem 2rem 4rem;
      min-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .hero-background {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 0;
    }

    .hero-bg-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .hero-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 76, 129, 0.7);
      z-index: 1;
    }

    .hero-content {
      position: relative;
      z-index: 2;
      text-align: center;
      max-width: 900px;
    }

    .hero-title {
      font-size: 3.5rem;
      font-weight: 800;
      color: white;
      margin-bottom: 1rem;
      line-height: 1.2;
    }

    .hero-subtitle {
      font-size: 1.25rem;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 2rem;
    }

    .hero-search {
      display: flex;
      gap: 0.5rem;
      background: white;
      padding: 0.5rem;
      border-radius: 0.75rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }

    .hero-search-input {
      flex: 1;
      min-width: 150px;
      padding: 0.75rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      font-size: 0.875rem;
    }

    .hero-search-input:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    .hero-search-select {
      padding: 0.75rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      font-size: 0.875rem;
      background: white;
      cursor: pointer;
    }

    .hero-search-button {
      background: var(--color-primary);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }

    .hero-search-button:hover {
      background: var(--color-primary-dark);
    }

    .hero-search-button svg {
      width: 20px;
      height: 20px;
    }

    .hero-tabs {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      margin-bottom: 2rem;
    }

    .hero-tab {
      padding: 0.75rem 1.5rem;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 2rem;
      background: transparent;
      color: white;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .hero-tab:hover {
      border-color: white;
    }

    .hero-tab.active {
      background: white;
      color: var(--color-primary);
      border-color: white;
    }

    .hero-stats {
      display: flex;
      gap: 3rem;
      justify-content: center;
    }

    .hero-stat {
      text-align: center;
    }

    .hero-stat-number {
      font-size: 2rem;
      font-weight: 800;
      color: var(--color-accent);
    }

    .hero-stat-label {
      color: rgba(255, 255, 255, 0.9);
      font-size: 0.875rem;
    }

    /* Listings Section */
    .listings {
      padding: 5rem 2rem;
      background: #FFFFFF;
    }

    .section-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .section-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--color-primary);
      text-align: center;
      margin-bottom: 3rem;
    }

    .listings-carousel-wrap {
      position: relative;
      margin-bottom: 2rem;
      overflow: hidden;
      -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 4%, #000 96%, transparent 100%);
      mask-image: linear-gradient(90deg, transparent 0, #000 4%, #000 96%, transparent 100%);
    }

    .listings-grid {
      display: flex;
      gap: 1.5rem;
      width: max-content;
      animation: listings-scroll 30s linear infinite;
    }

    .listings-carousel-wrap:hover .listings-grid {
      animation-play-state: paused;
    }

    @keyframes listings-scroll {
      from { transform: translateX(0); }
      to { transform: translateX(calc(-50% - 0.75rem)); }
    }

    .listing-card {
      background: white;
      border-radius: 1rem;
      overflow: hidden;
      border: 1px solid var(--color-border);
      transition: all 0.3s;
      text-decoration: none;
      display: block;
      width: 300px;
      flex-shrink: 0;
    }

    .listing-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
    }

    .listing-image {
      height: 180px;
      position: relative;
      overflow: hidden;
    }

    .listing-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }

    .listing-card:hover .listing-img {
      transform: scale(1.1);
    }

    .listing-badge {
      position: absolute;
      top: 1rem;
      left: 1rem;
      background: var(--color-accent);
      color: var(--color-primary);
      padding: 0.25rem 0.75rem;
      border-radius: 2rem;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .listing-price {
      position: absolute;
      bottom: 1rem;
      right: 1rem;
      background: rgba(15, 76, 129, 0.95);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-weight: 700;
      font-size: 0.875rem;
    }

    .listing-content {
      padding: 1rem;
    }

    .listing-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-primary);
      margin-bottom: 0.25rem;
    }

    .listing-location {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      margin-bottom: 0.75rem;
    }

    .listing-features {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .listing-feature {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .listing-feature svg {
      width: 14px;
      height: 14px;
    }

    .listing-button {
      width: 100%;
      padding: 0.5rem;
      font-size: 0.875rem;
    }

    .text-center {
      text-align: center;
    }

    /* Categories Section */
    .categories {
      padding: 5rem 2rem 5.5rem;
      background: linear-gradient(180deg, #f8fdf9 0%, #FFFFFF 100%);
    }

    .categories-header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .categories-eyebrow {
      display: inline-block;
      background: var(--color-primary-50);
      color: var(--color-primary);
      padding: 0.375rem 1rem;
      border-radius: 2rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.75px;
      text-transform: uppercase;
      margin-bottom: 1rem;
    }

    .categories-subtitle {
      color: var(--color-text-muted);
      font-size: 1rem;
      max-width: 560px;
      margin: 0.75rem auto 0;
      line-height: 1.65;
    }

    .categories-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      padding: 0 0.25rem;
    }

    /* Couleurs par type — CSS custom properties */
    .cat-maison    { --cat-color: #1A7A4A; --cat-bg: rgba(26,122,74,0.1);   --cat-border: rgba(26,122,74,0.35); }
    .cat-appartement { --cat-color: #1A6B9E; --cat-bg: rgba(26,107,158,0.1); --cat-border: rgba(26,107,158,0.35); }
    .cat-bureau    { --cat-color: #7C3AED; --cat-bg: rgba(124,58,237,0.1);  --cat-border: rgba(124,58,237,0.35); }
    .cat-villa     { --cat-color: #0F766E; --cat-bg: rgba(15,118,110,0.1);  --cat-border: rgba(15,118,110,0.35); }

    .category-card {
      background: white;
      border-radius: 1.25rem;
      border: 1.5px solid var(--color-border);
      padding: 1.75rem 1.25rem 1.375rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.875rem;
      text-decoration: none;
      transition: all 0.22s ease;
      position: relative;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
      cursor: pointer;
    }

    .category-card::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--cat-color);
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.22s ease;
    }

    .category-card:hover {
      transform: translateY(-7px);
      border-color: var(--cat-border);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.1);
    }

    .category-card:hover::after {
      transform: scaleX(1);
    }

    .cat-icon-wrap {
      width: 68px;
      height: 68px;
      border-radius: 1.125rem;
      background: var(--cat-bg);
      color: var(--cat-color);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.22s ease;
      flex-shrink: 0;
    }

    .category-card:hover .cat-icon-wrap {
      transform: scale(1.1);
    }

    .cat-icon-wrap svg {
      width: 30px;
      height: 30px;
    }

    .cat-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
    }

    .cat-name {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--color-text);
      text-align: center;
    }

    .cat-badge {
      background: var(--cat-bg);
      color: var(--cat-color);
      padding: 0.2rem 0.6875rem;
      border-radius: 2rem;
      font-size: 0.71875rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .cat-chevron {
      width: 18px;
      height: 18px;
      color: var(--cat-color);
      opacity: 0;
      transform: translateX(-4px);
      transition: opacity 0.18s ease, transform 0.18s ease;
    }

    .category-card:hover .cat-chevron {
      opacity: 1;
      transform: translateX(0);
    }

    /* Features Section */
    .features {
      padding: 6rem 2rem;
      background: #FFFFFF;
    }

    .features-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5rem;
      align-items: center;
    }

    .features-eyebrow {
      display: inline-block;
      background: var(--color-primary-50);
      color: var(--color-primary);
      padding: 0.375rem 1rem;
      border-radius: 2rem;
      font-size: 0.8125rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
    }

    .features-title {
      font-size: 2.5rem;
      font-weight: 800;
      line-height: 1.2;
      color: var(--color-primary-900);
      margin-bottom: 1rem;
    }

    .features-description {
      color: var(--color-text-muted);
      line-height: 1.7;
      font-size: 1.0625rem;
      margin-bottom: 2.5rem;
    }

    .features-list {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
      margin-bottom: 2.5rem;
    }

    .features-list::before {
      content: '';
      position: absolute;
      left: 23px;
      top: 48px;
      bottom: 48px;
      width: 2px;
      background: var(--color-primary-50);
    }

    .feature-item {
      position: relative;
      display: flex;
      gap: 1.25rem;
      align-items: flex-start;
    }

    .feature-step {
      position: relative;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--color-primary-50);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.25s;
    }

    .feature-item:hover .feature-step {
      background: var(--color-primary);
      color: white;
      transform: scale(1.08);
    }

    .feature-step svg {
      width: 22px;
      height: 22px;
    }

    .feature-content {
      padding-top: 0.5rem;
    }

    .feature-content .feature-title {
      font-size: 1.0625rem;
      font-weight: 700;
      color: var(--color-primary-900);
      margin-bottom: 0.3rem;
    }

    .feature-desc {
      color: var(--color-text-muted);
      font-size: 0.9375rem;
      line-height: 1.5;
    }

    .features-cta {
      display: flex;
      align-items: center;
      gap: 1.75rem;
      flex-wrap: wrap;
    }

    .btn-features-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.625rem;
      background: var(--color-primary);
      color: white;
      padding: 1rem 1.75rem;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.9375rem;
      text-decoration: none;
      box-shadow: 0 8px 20px rgba(15, 76, 129, 0.25);
      transition: all 0.25s;
    }

    .btn-features-primary:hover {
      background: var(--color-primary-dark);
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(15, 76, 129, 0.3);
    }

    .btn-features-primary svg {
      width: 18px;
      height: 18px;
      transition: transform 0.25s;
    }

    .btn-features-primary:hover svg {
      transform: translateX(3px);
    }

    .btn-features-link {
      color: var(--color-primary);
      font-weight: 600;
      font-size: 0.9375rem;
      text-decoration: none;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .btn-features-link:hover {
      border-bottom-color: var(--color-primary);
    }

    .features-visual {
      display: flex;
      justify-content: center;
    }

    .mockup-card {
      width: 100%;
      max-width: 420px;
      background: #FFFFFF;
      border-radius: 1.25rem;
      border: 1px solid var(--color-border);
      box-shadow: 0 30px 60px -15px rgba(15, 76, 129, 0.2);
      overflow: hidden;
    }

    .mockup-header {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.875rem 1.25rem;
      background: #F8FAFC;
      border-bottom: 1px solid var(--color-border);
    }

    .mockup-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .mockup-dot-red { background: #FF5F57; }
    .mockup-dot-yellow { background: #FEBC2E; }
    .mockup-dot-green { background: #28C840; }

    .mockup-title-bar {
      margin-left: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text-muted);
    }

    .mockup-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      padding: 1.25rem;
    }

    .mockup-stat {
      background: var(--color-primary-50);
      border-radius: 0.75rem;
      padding: 0.875rem 0.625rem;
      text-align: center;
    }

    .mockup-stat-icon {
      font-size: 1.25rem;
      margin-bottom: 0.25rem;
    }

    .mockup-stat-value {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--color-primary-900);
      line-height: 1.2;
    }

    .mockup-stat-label {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      font-weight: 500;
    }

    .mockup-chart {
      margin: 0 1.25rem 1.25rem;
      background: #F8FAFC;
      border-radius: 0.75rem;
      padding: 1rem;
    }

    .mockup-chart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.875rem;
    }

    .mockup-chart-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-muted);
    }

    .mockup-trend {
      font-size: 0.75rem;
      font-weight: 700;
      color: #16A34A;
      background: rgba(22, 163, 74, 0.1);
      padding: 0.15rem 0.5rem;
      border-radius: 1rem;
    }

    .mockup-bars {
      display: flex;
      align-items: flex-end;
      gap: 0.5rem;
      height: 70px;
      margin-bottom: 0.75rem;
    }

    .mockup-bar {
      flex: 1;
      background: var(--color-primary-50);
      border-radius: 4px 4px 0 0;
    }

    .mockup-bar-accent {
      background: var(--color-accent);
    }

    .mockup-chart-footer {
      border-top: 1px solid var(--color-border);
      padding-top: 0.625rem;
    }

    .mockup-total {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--color-primary-900);
    }

    .mockup-activity {
      padding: 0 1.25rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .mockup-activity-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .mockup-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6875rem;
      font-weight: 700;
      color: white;
      flex-shrink: 0;
    }

    .mockup-av-green { background: #16A34A; }
    .mockup-av-orange { background: #EA580C; }

    .mockup-activity-text {
      flex: 1;
      min-width: 0;
    }

    .mockup-activity-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-primary-900);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .mockup-activity-sub {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
    }

    .mockup-badge {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.25rem 0.625rem;
      border-radius: 1rem;
      flex-shrink: 0;
    }

    .mockup-badge-paid {
      background: rgba(22, 163, 74, 0.1);
      color: #16A34A;
    }

    .mockup-badge-late {
      background: rgba(220, 38, 38, 0.1);
      color: #DC2626;
    }

    /* Stats Section */
    .stats {
      position: relative;
      padding: 5rem 2rem;
      overflow: hidden;
    }

    .stats-background {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 0;
    }

    .stats-bg-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 30%;
    }

    .stats-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg,
        rgba(10, 38, 80, 0.95) 0%,
        rgba(15, 76, 129, 0.92) 60%,
        rgba(8, 30, 65, 0.97) 100%);
      z-index: 1;
    }

    .stats-inner {
      position: relative;
      z-index: 2;
      max-width: 1300px;
      margin: 0 auto;
    }

    /* En-t&#234;te stats */
    .stats-tagline {
      text-align: center;
      margin-bottom: 3.5rem;
    }

    .stats-eyebrow {
      display: inline-block;
      background: rgba(245, 158, 11, 0.2);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: var(--color-accent);
      padding: 0.375rem 1rem;
      border-radius: 2rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 1rem;
    }

    .stats-heading {
      font-size: 2rem;
      font-weight: 800;
      color: white;
      line-height: 1.2;
    }

    /* Grille des stats */
    .stats-container {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stats-sep {
      width: 1px;
      height: 80px;
      background: rgba(255, 255, 255, 0.18);
      flex-shrink: 0;
      margin: 0 0.5rem;
    }

    .stat-item {
      text-align: center;
      flex: 1;
      padding: 0 2rem;
    }

    .stat-icon-top {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.125rem;
      color: var(--color-accent);
      transition: background 0.2s;
    }

    .stat-item:hover .stat-icon-top {
      background: rgba(255, 255, 255, 0.2);
    }

    .stat-icon-top svg {
      width: 24px;
      height: 24px;
    }

    .stat-number {
      font-size: 3.5rem;
      font-weight: 900;
      color: var(--color-accent);
      line-height: 1;
      margin-bottom: 0.625rem;
      letter-spacing: -1.5px;
    }

    .stat-label {
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.9375rem;
      font-weight: 500;
      letter-spacing: 0.1px;
    }

    /* Paiements */
    .stat-payment .stat-number {
      display: none;
    }

    .payment-badges {
      display: flex;
      gap: 0.625rem;
      justify-content: center;
      margin-bottom: 0.75rem;
    }

    .payment-badge {
      background: rgba(255, 255, 255, 0.12);
      border: 1.5px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 0.4375rem 1.125rem;
      border-radius: 0.5rem;
      font-size: 0.9375rem;
      font-weight: 700;
      letter-spacing: 0.25px;
      transition: background 0.15s;
    }

    .payment-badge:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    /* Cities Section */
    .cities {
      padding: 5rem 2rem;
      background: #FFFFFF;
    }

    .cities-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }

    .city-card {
      border-radius: 1rem;
      overflow: hidden;
      border: 1px solid var(--color-border);
      transition: all 0.3s;
      cursor: pointer;
      text-decoration: none;
      display: block;
    }

    .city-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
    }

    .city-image {
      height: 150px;
      overflow: hidden;
    }

    .city-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }

    .city-card:hover .city-img {
      transform: scale(1.1);
    }

    .city-content {
      padding: 1rem;
      background: white;
    }

    .city-name {
      font-weight: 600;
      color: var(--color-primary);
      margin-bottom: 0.25rem;
    }

    .city-count {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    /* Testimonials Section */
    .testimonials {
      padding: 5rem 2rem;
      background: var(--color-primary-50);
    }

    .testimonials-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
    }

    .testimonial-card {
      background: white;
      padding: 2rem;
      border-radius: 1rem;
      border: 1px solid var(--color-border);
      text-align: center;
    }

    .testimonial-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      margin: 0 auto 1rem;
      display: block;
      border: 3px solid var(--color-accent);
    }

    .testimonial-rating {
      display: flex;
      gap: 0.25rem;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .testimonial-rating svg {
      width: 20px;
      height: 20px;
    }

    .testimonial-text {
      color: var(--color-text-muted);
      line-height: 1.6;
      margin-bottom: 1rem;
      font-style: italic;
    }

    .testimonial-name {
      font-weight: 600;
      color: var(--color-primary);
      margin-bottom: 0.25rem;
    }

    .testimonial-role {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    /* CTA Section */
    .cta {
      position: relative;
      padding: 5rem 2rem;
      text-align: center;
    }

    .cta-background {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 0;
    }

    .cta-bg-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .cta-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(15, 76, 129, 0.9) 0%, rgba(10, 53, 88, 0.9) 100%);
      z-index: 1;
    }

    .cta-container {
      position: relative;
      z-index: 2;
      max-width: 800px;
      margin: 0 auto;
    }

    .cta-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: white;
      margin-bottom: 1rem;
    }

    .cta-subtitle {
      color: rgba(255, 255, 255, 0.9);
      font-size: 1.125rem;
      margin-bottom: 2rem;
    }

    .cta-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    /* Footer */
    .footer {
      background: linear-gradient(135deg,
        rgba(10, 38, 80, 1) 0%,
        rgba(15, 76, 129, 1) 60%,
        rgba(8, 30, 65, 1) 100%);
      padding: 4.5rem 2rem 0;
    }

    .footer-container {
      max-width: 1400px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr 1fr;
      gap: 3rem;
      padding-bottom: 3.5rem;
    }

    .footer-section {
      display: flex;
      flex-direction: column;
    }

    .footer-logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .footer-logo .logo-img {
      height: 160px;
      width: auto;
      object-fit: contain;
      border-radius: 12px;
      padding: 20px 28px;
      background: white;
      mix-blend-mode: normal;
    }

    .footer-description {
      color: rgba(255, 255, 255, 0.65);
      line-height: 1.6;
      max-width: 320px;
      margin-bottom: 1.25rem;
    }

    .footer-payment {
      display: flex;
      gap: 0.625rem;
      margin-bottom: 1.5rem;
    }

    .footer-payment-badge {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: rgba(255, 255, 255, 0.85);
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.3rem 0.75rem;
      border-radius: 0.4rem;
    }

    .footer-title {
      color: white;
      font-weight: 700;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1.5rem;
      position: relative;
      padding-bottom: 0.875rem;
    }

    .footer-title::after {
      content: '';
      position: absolute;
      left: 0;
      bottom: 0;
      width: 28px;
      height: 2px;
      background: var(--color-accent);
      border-radius: 2px;
    }

    .footer-link {
      color: rgba(255, 255, 255, 0.65);
      text-decoration: none;
      margin-bottom: 0.875rem;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9375rem;
      width: fit-content;
    }

    .footer-link:hover {
      color: var(--color-accent);
      transform: translateX(3px);
    }

    .footer-link-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .footer-social {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.25rem;
    }

    .social-link {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      transition: all 0.2s;
    }

    .social-link:hover {
      background: var(--color-accent);
      border-color: var(--color-accent);
      color: var(--color-primary);
      transform: translateY(-3px);
    }

    .social-link svg {
      width: 18px;
      height: 18px;
    }

    .footer-bottom {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1.75rem 0;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .footer-copyright {
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.8125rem;
    }

    .footer-legal {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .footer-legal-link {
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.8125rem;
      text-decoration: none;
      transition: color 0.2s;
    }

    .footer-legal-link:hover {
      color: var(--color-accent);
    }

    .footer-legal-sep {
      color: rgba(255, 255, 255, 0.25);
      font-size: 0.75rem;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .navbar-nav {
        display: none;
      }
      .mobile-menu-btn {
        display: flex;
      }

      .categories-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
      }

      .features-layout {
        grid-template-columns: 1fr;
      }

      .features-visual {
        display: none;
      }

      .stats-container {
        grid-template-columns: repeat(2, 1fr);
      }

      .cities-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .testimonials-grid {
        grid-template-columns: 1fr;
      }

      .footer-container {
        grid-template-columns: repeat(2, 1fr);
      }

      .footer-brand {
        grid-column: span 2;
      }
    }

    @media (max-width: 768px) {
      .navbar-container {
        height: 72px;
      }

      .navbar-logo .logo-img {
        height: 58px;
      }

      .navbar-actions {
        display: none;
      }

      .announce-text {
        display: none;
      }

      .hero-title {
        font-size: 2.5rem;
      }

      .hero-search {
        flex-direction: column;
      }

      .hero-stats {
        flex-direction: column;
        gap: 1.5rem;
      }

      .listing-card {
        width: 250px;
      }

      .categories-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.625rem;
      }

      .stats-container {
        grid-template-columns: 1fr;
      }

      .cities-grid {
        grid-template-columns: 1fr;
      }

      .footer-container {
        grid-template-columns: 1fr;
      }

      .footer-brand {
        grid-column: span 1;
      }

      .footer-bottom {
        flex-direction: column;
        text-align: center;
      }

      .section-title {
        font-size: 2rem;
      }

      .features-title {
        font-size: 1.875rem;
      }

      .cta-title {
        font-size: 2rem;
      }
    }
  `]
})
export class LandingComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    // Le rendu SSR n'a pas accès au DOM/window : ces interactions ne s'exécutent que côté navigateur
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Navbar shadow on scroll
    window.addEventListener('scroll', () => {
      const navbar = document.getElementById('navbar');
      if (navbar) {
        navbar.classList.toggle('scrolled', window.scrollY > 20);
      }
    });

    // Menu mobile toggle
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileBtn && mobileMenu) {
      mobileBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('open');
      });
    }

    // Stats counter animation
    this.animateStats();
  }

  private animateStats(): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const statNumbers = entry.target.querySelectorAll('.stat-number');
          statNumbers.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-target') || '0');
            this.animateCounter(stat as HTMLElement, target);
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    const statsSection = document.querySelector('.stats');
    if (statsSection) {
      observer.observe(statsSection);
    }
  }

  private animateCounter(element: HTMLElement, target: number): void {
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        element.textContent = target + (target === 98 ? '%' : '+');
        clearInterval(timer);
      } else {
        element.textContent = Math.floor(current) + '+';
      }
    }, 30);
  }
}

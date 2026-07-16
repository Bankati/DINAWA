import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Meta, Title } from "@angular/platform-browser";
import { FormBuilder, Validators, ReactiveFormsModule } from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { AnnoncesService } from "../../services/annonces.service";
import { Annonce, TypeAnnonce } from "@core/models/annonce.model";
import { LokSkeletonComponent } from "../../../../shared/components/lok-skeleton/lok-skeleton.component";

@Component({
  selector: "app-annonce-detail-public",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LokSkeletonComponent,
  ],
  template: `
    <div class="detail-page">
      <!-- Topbar -->
      <div class="topbar">
        <div class="topbar-inner">
          <button (click)="goBack()" class="back-btn">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Retour aux annonces
          </button>
          <div class="share-btns">
            <button
              (click)="partager('whatsapp')"
              class="share-btn share-wa"
              title="WhatsApp"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.15-.149.345-.39.523-.587.174-.195.23-.334.346-.559.111-.225.056-.42-.041-.57-.097-.149-.81-1.949-1.054-2.563-.247-.611-.5-.529-.69-.539-.18-.01-.39-.01-.598-.01-.21 0-.553.08-.846.395-.293.314-1.12 1.095-1.12 2.67 0 1.572 1.155 3.092 1.314 3.305.16.21 2.197 3.36 5.328 4.573 3.13 1.213 3.13.81 3.696.758.567-.05 1.833-.75 2.093-1.473.26-.722.26-1.34.18-1.474-.075-.13-.27-.205-.57-.354z"
                />
                <path
                  d="M12.012 2C6.504 2 2 6.477 2 12c0 1.93.55 3.74 1.5 5.27L2 22l4.84-1.47A9.96 9.96 0 0012.012 22C17.52 22 22 17.523 22 12S17.52 2 12.012 2zm0 18.18c-1.7 0-3.27-.5-4.6-1.36l-.33-.21-3.4 1.03 1.04-3.33-.22-.34A8.13 8.13 0 013.84 12c0-4.5 3.67-8.16 8.18-8.16 4.5 0 8.16 3.66 8.16 8.16 0 4.5-3.66 8.18-8.17 8.18z"
                />
              </svg>
            </button>
            <button
              (click)="copierLien()"
              class="share-btn share-copy"
              title="Copier le lien"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 11-5.656-5.656l1.5-1.5"
                />
                <path
                  d="M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 115.656 5.656l-1.5 1.5"
                />
              </svg>
            </button>
            @if (lienCopie) {
              <span class="copy-toast">Lien copié !</span>
            }
          </div>
        </div>
      </div>

      @if (loading) {
        <div class="loading-wrap">
          <lok-skeleton type="card"></lok-skeleton>
          <lok-skeleton type="card"></lok-skeleton>
        </div>
      } @else if (annonce) {
        <!-- Hero image -->
        <div class="detail-hero">
          @if (annonce.photos && annonce.photos.length > 0) {
            <img
              [src]="photoPrincipale"
              [alt]="annonce.titre"
              class="detail-hero-img"
            />
          } @else {
            <div class="detail-hero-placeholder">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
          }
          <!-- Galerie vignettes -->
          @if (annonce.photos && annonce.photos.length > 1) {
            <div class="photo-thumbs">
              @for (photo of annonce.photos; track photo; let i = $index) {
                <button
                  class="thumb-btn"
                  [class.thumb-active]="photoPrincipale === photo"
                  (click)="photoPrincipale = photo"
                >
                  <img
                    [src]="photo"
                    [alt]="'Photo ' + (i + 1)"
                    class="thumb-img"
                  />
                </button>
              }
            </div>
          }
        </div>

        <!-- Contenu principal -->
        <div class="detail-body">
          <div class="detail-grid">
            <!-- Colonne gauche -->
            <div class="detail-main">
              <!-- Titre + badges -->
              <div class="detail-title-block">
                <div class="detail-badges">
                  <span
                    class="type-badge"
                    [class.badge-loc]="annonce.type === TypeAnnonce.LOCATION"
                    [class.badge-ven]="annonce.type === TypeAnnonce.VENTE"
                  >
                    {{
                      annonce.type === TypeAnnonce.LOCATION
                        ? "Location"
                        : "Vente"
                    }}
                  </span>
                  @if (annonce.typeBien) {
                    <span class="bien-badge">{{ annonce.typeBien }}</span>
                  }
                  @if (annonce.statut === "ACTIVE") {
                    <span class="dispo-badge">Disponible</span>
                  }
                </div>
                <h1 class="detail-title">{{ annonce.titre }}</h1>
                <p class="detail-location">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                    ></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  {{ annonce.adresse.quartier }}, {{ annonce.adresse.ville }}
                </p>
              </div>

              <!-- Description -->
              <div class="detail-section">
                <h2 class="section-title">Description</h2>
                <p class="section-text">{{ annonce.description }}</p>
              </div>

              <!-- Localisation -->
              <div class="detail-section">
                <h2 class="section-title">Localisation</h2>
                <div class="loc-row">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span
                    >{{ annonce.adresse.quartier }},
                    {{ annonce.adresse.ville }}</span
                  >
                </div>
                <p class="loc-note">
                  L'adresse exacte sera communiquée après validation de votre
                  candidature.
                </p>
              </div>
            </div>

            <!-- Colonne droite -->
            <div class="detail-aside">
              <!-- Prix -->
              <div class="aside-card price-card">
                <div class="price-amount">
                  {{ annonce.prix | number: "1.0-0" }}
                  <span class="price-currency">FCFA</span>
                </div>
                <div class="price-period">
                  {{
                    annonce.type === TypeAnnonce.LOCATION
                      ? "par mois"
                      : "prix de vente"
                  }}
                </div>
              </div>

              <!-- Propriétaire -->
              <div class="aside-card">
                <h3 class="aside-card-title">Propriétaire</h3>
                <div class="owner-row">
                  <div class="owner-avatar">
                    {{ premierPrenom(annonce.contact.nom).charAt(0) }}
                  </div>
                  <div class="owner-info">
                    <p class="owner-name">
                      {{ premierPrenom(annonce.contact.nom) }}
                    </p>
                    @if (annonce.contact.note) {
                      <div class="owner-rating">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <polygon
                            points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                          ></polygon>
                        </svg>
                        {{ annonce.contact.note }}/5
                      </div>
                    }
                  </div>
                </div>
                @if (annonce.contact.nombreBiensGeres) {
                  <p class="owner-biens">
                    {{ annonce.contact.nombreBiensGeres }} bien(s) géré(s) sur
                    WARAH
                  </p>
                }
              </div>

              <!-- Formulaire de contact -->
              <div class="aside-card contact-card">
                @if (!messageEnvoye) {
                  <h3 class="aside-card-title">Vous êtes intéressé(e) ?</h3>
                  <form
                    [formGroup]="contactForm"
                    (ngSubmit)="envoyerMessage()"
                    class="contact-form"
                  >
                    <div class="cf-group">
                      <label class="cf-label" for="annonce-contact-prenom"
                        >Votre prénom</label
                      >
                      <input
                        id="annonce-contact-prenom"
                        type="text"
                        formControlName="prenom"
                        class="cf-input"
                        placeholder="Ex : Kofi"
                      />
                    </div>
                    <div class="cf-group">
                      <label
                        class="cf-label"
                        for="annonce-contact-telephone-form"
                        >Téléphone</label
                      >
                      <input
                        id="annonce-contact-telephone-form"
                        type="tel"
                        formControlName="telephone"
                        class="cf-input"
                        placeholder="+228 90 00 00 00"
                      />
                    </div>
                    <div class="cf-group">
                      <label class="cf-label" for="annonce-contact-message"
                        >Message (optionnel)</label
                      >
                      <textarea
                        id="annonce-contact-message"
                        formControlName="message"
                        rows="3"
                        class="cf-input cf-textarea"
                        placeholder="Je souhaite visiter ce bien..."
                      ></textarea>
                    </div>
                    <button
                      type="submit"
                      [disabled]="contactForm.invalid || envoiEnCours"
                      class="cf-submit"
                    >
                      {{
                        envoiEnCours ? "Envoi..." : "Contacter le propriétaire"
                      }}
                    </button>
                  </form>
                } @else {
                  <div class="contact-success">
                    <div class="success-icon">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <p class="success-title">Message envoyé !</p>
                    <p class="success-sub">
                      Le propriétaire vous recontactera directement.
                    </p>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .detail-page {
      min-height: 100vh;
      background: #f4f6f9;
      font-family: "Inter", sans-serif;
    }

    /* ── Topbar ── */
    .topbar {
      background: white;
      border-bottom: 1px solid #e5e7eb;
      position: sticky;
      top: 0;
      z-index: 20;
    }

    .topbar-inner {
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 2rem;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-muted);
      background: none;
      border: none;
      cursor: pointer;
      transition: color 0.2s;
      padding: 0;
    }

    .back-btn svg {
      width: 18px;
      height: 18px;
    }
    .back-btn:hover {
      color: var(--color-primary);
    }

    .share-btns {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .share-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid #e5e7eb;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .share-btn svg {
      width: 18px;
      height: 18px;
    }

    .share-wa {
      color: #25d366;
    }
    .share-wa:hover {
      background: #f0fdf4;
      border-color: #25d366;
    }
    .share-copy {
      color: var(--color-text-muted);
    }
    .share-copy:hover {
      background: var(--color-primary-50);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .copy-toast {
      font-size: 0.8125rem;
      color: var(--color-primary);
      font-weight: 500;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .loading-wrap {
      max-width: 1100px;
      margin: 2rem auto;
      padding: 0 2rem;
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.5rem;
    }

    /* ── Hero image ── */
    .detail-hero {
      background: #1a1a2e;
      position: relative;
    }

    .detail-hero-img {
      width: 100%;
      height: 380px;
      object-fit: cover;
      display: block;
    }

    .detail-hero-placeholder {
      height: 380px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e5e7eb;
    }

    .detail-hero-placeholder svg {
      width: 80px;
      height: 80px;
      color: #9ca3af;
    }

    .photo-thumbs {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: rgba(0, 0, 0, 0.6);
      overflow-x: auto;
    }

    .thumb-btn {
      width: 72px;
      height: 54px;
      border-radius: 6px;
      overflow: hidden;
      border: 2px solid transparent;
      cursor: pointer;
      flex-shrink: 0;
      padding: 0;
      transition: border-color 0.18s;
    }

    .thumb-btn.thumb-active {
      border-color: var(--color-accent);
    }

    .thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* ── Body ── */
    .detail-body {
      max-width: 1100px;
      margin: 0 auto;
      padding: 2rem 2rem 3rem;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 2rem;
      align-items: start;
    }

    /* ── Main column ── */
    .detail-main {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .detail-title-block {
      background: white;
      border-radius: 14px;
      border: 1px solid #e5e7eb;
      padding: 1.5rem;
    }

    .detail-badges {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 0.75rem;
    }

    .type-badge,
    .bien-badge,
    .dispo-badge {
      display: inline-flex;
      padding: 0.2rem 0.75rem;
      border-radius: 999px;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .badge-loc {
      background: rgba(15, 76, 129, 0.1);
      color: var(--color-primary);
    }
    .badge-ven {
      background: rgba(201, 152, 46, 0.15);
      color: #92400e;
    }
    .bien-badge {
      background: #f3f4f6;
      color: #374151;
    }
    .dispo-badge {
      background: #d1fae5;
      color: #065f46;
    }

    .detail-title {
      font-size: 1.625rem;
      font-weight: 800;
      color: var(--color-text);
      line-height: 1.2;
      margin-bottom: 0.5rem;
    }

    .detail-location {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.9375rem;
      color: var(--color-text-muted);
    }

    .detail-location svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .detail-section {
      background: white;
      border-radius: 14px;
      border: 1px solid #e5e7eb;
      padding: 1.5rem;
    }

    .section-title {
      font-size: 1.0625rem;
      font-weight: 700;
      color: var(--color-text);
      margin-bottom: 0.875rem;
    }

    .section-text {
      font-size: 0.9375rem;
      color: #374151;
      line-height: 1.65;
    }

    .loc-row {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      font-size: 0.9375rem;
      color: var(--color-text);
      margin-bottom: 0.75rem;
    }

    .loc-row svg {
      width: 18px;
      height: 18px;
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    .loc-note {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      background: #f9fafb;
      border-radius: 8px;
      padding: 0.625rem 0.875rem;
    }

    /* ── Aside ── */
    .detail-aside {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      position: sticky;
      top: 72px;
    }

    .aside-card {
      background: white;
      border-radius: 14px;
      border: 1px solid #e5e7eb;
      padding: 1.25rem;
    }

    .aside-card-title {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--color-text);
      margin-bottom: 1rem;
    }

    /* Prix */
    .price-card {
      background: linear-gradient(
        135deg,
        var(--color-primary) 0%,
        var(--color-primary-dark) 100%
      );
      border-color: transparent;
      text-align: center;
      padding: 1.5rem;
    }

    .price-amount {
      font-size: 2rem;
      font-weight: 800;
      color: white;
      line-height: 1;
    }

    .price-currency {
      font-size: 1.125rem;
      font-weight: 600;
    }

    .price-period {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.7);
      margin-top: 0.375rem;
    }

    /* Propriétaire */
    .owner-row {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      margin-bottom: 0.75rem;
    }

    .owner-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--color-primary-50);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.125rem;
      flex-shrink: 0;
    }

    .owner-name {
      font-weight: 600;
      color: var(--color-text);
      font-size: 0.9375rem;
    }

    .owner-rating {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      color: #92400e;
      margin-top: 0.125rem;
    }

    .owner-rating svg {
      width: 12px;
      height: 12px;
      fill: var(--color-accent);
    }

    .owner-biens {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    /* Contact form */
    .contact-card {
    }

    .contact-form {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }

    .cf-group {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .cf-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .cf-input {
      width: 100%;
      height: 42px;
      padding: 0 0.875rem;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      font-size: 0.875rem;
      color: var(--color-text);
      box-sizing: border-box;
      transition: border-color 0.2s;
      font-family: inherit;
    }

    .cf-input:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(15, 76, 129, 0.1);
    }

    .cf-textarea {
      height: auto;
      padding: 0.625rem 0.875rem;
      resize: none;
    }

    .cf-submit {
      width: 100%;
      height: 46px;
      background: linear-gradient(
        135deg,
        var(--color-accent),
        var(--color-accent-light, #e8b84b)
      );
      color: var(--color-primary-900);
      border: none;
      border-radius: 10px;
      font-size: 0.9375rem;
      font-weight: 700;
      cursor: pointer;
      transition:
        filter 0.2s,
        transform 0.2s;
      font-family: inherit;
    }

    .cf-submit:hover:not(:disabled) {
      filter: brightness(1.08);
      transform: translateY(-1px);
    }

    .cf-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Succès */
    .contact-success {
      text-align: center;
      padding: 1rem 0;
    }

    .success-icon {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #d1fae5;
      color: #065f46;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 0.875rem;
    }

    .success-icon svg {
      width: 24px;
      height: 24px;
    }
    .success-title {
      font-weight: 700;
      color: var(--color-text);
      margin-bottom: 0.375rem;
    }
    .success-sub {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      line-height: 1.4;
    }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .detail-grid {
        grid-template-columns: 1fr;
      }
      .detail-aside {
        position: static;
      }
      .detail-body {
        padding: 1.25rem 1.25rem 2rem;
      }
      .detail-hero-img {
        height: 260px;
      }
    }

    @media (max-width: 600px) {
      .topbar-inner {
        padding: 0 1rem;
      }
      .detail-body {
        padding: 1rem 1rem 2rem;
      }
      .detail-hero-img {
        height: 220px;
      }
      .detail-title {
        font-size: 1.375rem;
      }
      .price-amount {
        font-size: 1.625rem;
      }
    }
  `,
})
export class AnnonceDetailPublicComponent implements OnInit {
  annonce: Annonce | null = null;
  loading = true;
  TypeAnnonce = TypeAnnonce;
  photoPrincipale = "";

  // Type inféré depuis fb.nonNullable.group() — jamais annoter en
  // `FormGroup` nu (voir /review frontend).
  contactForm: ReturnType<AnnonceDetailPublicComponent["buildForm"]>;
  envoiEnCours = false;
  messageEnvoye = false;
  lienCopie = false;

  private readonly annoncesService = inject(AnnoncesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  constructor() {
    this.contactForm = this.buildForm();
  }

  private buildForm() {
    return this.fb.nonNullable.group({
      prenom: ["", Validators.required],
      telephone: ["", Validators.required],
      message: [""],
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get("id");
      if (id) this.loadAnnonce(id);
    });
  }

  loadAnnonce(id: string): void {
    this.loading = true;
    this.annoncesService.getAnnonceById(id).subscribe({
      next: (data) => {
        this.annonce = data;
        this.photoPrincipale = data.photos?.[0] ?? "";
        this.loading = false;
        this.updateMetaTags(data);
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private updateMetaTags(a: Annonce): void {
    const titre = `${a.titre} — ${a.adresse.quartier}, ${a.adresse.ville} | WARAH`;
    const desc =
      a.description.length > 160
        ? `${a.description.slice(0, 157)}...`
        : a.description;
    this.titleService.setTitle(titre);
    this.metaService.updateTag({ name: "description", content: desc });
    this.metaService.updateTag({ property: "og:title", content: titre });
    this.metaService.updateTag({ property: "og:description", content: desc });
    if (a.photos?.[0])
      this.metaService.updateTag({
        property: "og:image",
        content: a.photos[0],
      });
  }

  premierPrenom(nom: string): string {
    return nom?.split(" ")[0] || "";
  }

  envoyerMessage(): void {
    if (this.contactForm.invalid) return;
    this.envoiEnCours = true;
    setTimeout(() => {
      this.envoiEnCours = false;
      this.messageEnvoye = true;
    }, 1000);
  }

  partager(canal: "whatsapp" | "facebook"): void {
    const url = window.location.href;
    const texte = this.annonce
      ? `Découvrez cette annonce sur WARAH : ${this.annonce.titre}`
      : "Découvrez cette annonce sur WARAH";
    if (canal === "whatsapp") {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(texte + " " + url)}`,
        "_blank",
      );
    } else {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        "_blank",
      );
    }
  }

  copierLien(): void {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      this.lienCopie = true;
      setTimeout(() => (this.lienCopie = false), 2000);
    });
  }

  goBack(): void {
    void this.router.navigate(["/annonces"]);
  }
}

import { Component, Input, Output, EventEmitter } from "@angular/core";
import { Bien } from "../../../core/models/bien.model";
import { LokBadgeStatutComponent } from "../lok-badge-statut/lok-badge-statut.component";
import { LokMontantFcfaComponent } from "../lok-montant-fcfa/lok-montant-fcfa.component";
import { FcfaPipe } from "../../pipes/fcfa.pipe";

@Component({
  selector: "lok-card-bien",
  standalone: true,
  imports: [LokBadgeStatutComponent, LokMontantFcfaComponent, FcfaPipe],
  template: `
    <div
      class="card hover:shadow-md transition-shadow cursor-pointer"
      (click)="cardClick.emit(bien.id)"
      (keydown.enter)="cardClick.emit(bien.id)"
      role="button"
      tabindex="0"
    >
      <!-- Photo principale -->
      <div class="relative h-48 rounded-lg overflow-hidden mb-4 bg-gray-200">
        @if (bien.photos && bien.photos.length > 0) {
          <img
            [src]="bien.photos[0]"
            [alt]="bien.titre"
            class="w-full h-full object-cover"
            loading="lazy"
          />
        } @else {
          <div
            class="w-full h-full flex items-center justify-center text-gray-400"
          >
            <svg
              class="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
        }

        <!-- Badge statut -->
        <div class="absolute top-3 right-3">
          <lok-badge-statut [statut]="bien.statut"></lok-badge-statut>
        </div>
      </div>

      <!-- Informations du bien -->
      <div class="space-y-2">
        <h3 class="font-semibold text-gray-900 truncate">{{ bien.titre }}</h3>

        <p class="text-sm text-gray-600 flex items-center">
          <svg
            class="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {{ bien.adresse.quartier }}, {{ bien.adresse.ville }}
        </p>

        <div class="flex items-center justify-between text-sm text-gray-600">
          <span class="flex items-center">
            <svg
              class="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
            {{ bien.surface }} m²
          </span>
          <span class="flex items-center">
            <svg
              class="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            {{ bien.nbPieces }} p.
          </span>
        </div>

        <div class="pt-2 border-t border-gray-200">
          <lok-montant-fcfa
            [montant]="bien.loyer"
            size="lg"
            color="primary"
          ></lok-montant-fcfa>
          @if (bien.charges && bien.charges > 0) {
            <p class="text-xs text-gray-500 mt-1">
              + {{ bien.charges | fcfa }} charges
            </p>
          }
        </div>

        @if (showActions) {
          <div class="pt-3 flex gap-2">
            <button
              class="flex-1 btn-secondary text-sm py-2"
              (click)="$event.stopPropagation(); edit.emit(bien.id)"
            >
              Modifier
            </button>
            <button
              class="flex-1 btn-primary text-sm py-2"
              (click)="$event.stopPropagation(); view.emit(bien.id)"
            >
              Voir
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class LokCardBienComponent {
  @Input({ required: true }) bien!: Bien;
  @Input() showActions: boolean = true;
  @Output() cardClick = new EventEmitter<string>();
  @Output() edit = new EventEmitter<string>();
  @Output() view = new EventEmitter<string>();
}

/*
 * Exemple d'utilisation :
 *
 * <lok-card-bien
 *   [bien]="bien"
 *   [showActions]="true"
 *   (cardClick)="navigateToBien($event)"
 *   (edit)="editBien($event)"
 *   (view)="viewBien($event)"
 * ></lok-card-bien>
 *
 * Sans actions :
 * <lok-card-bien [bien]="bien" [showActions]="false"></lok-card-bien>
 */

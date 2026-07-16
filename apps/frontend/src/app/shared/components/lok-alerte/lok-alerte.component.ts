import {
  Component,
  Input,
  Output,
  EventEmitter,
  computed,
} from "@angular/core";

export type TypeAlerte = "info" | "warning" | "error" | "success";

@Component({
  selector: "lok-alerte",
  standalone: true,
  template: `
    <div
      [class]="containerClasses()"
      class="rounded-lg p-4 flex items-start gap-3"
    >
      <!-- Icône -->
      <div
        [class]="iconContainerClasses()"
        class="flex-shrink-0 p-1 rounded-full"
      >
        <svg
          [class]="iconClasses()"
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            [attr.d]="iconPath()"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
        </svg>
      </div>

      <!-- Contenu -->
      <div class="flex-1">
        @if (titre) {
          <h4 [class]="titleClasses()" class="font-semibold mb-1">
            {{ titre }}
          </h4>
        }
        <p [class]="messageClasses()" class="text-sm">{{ message }}</p>
      </div>

      <!-- Bouton fermer -->
      @if (dismissible) {
        <button
          (click)="closed.emit()"
          class="flex-shrink-0 p-1 hover:opacity-70 transition-opacity"
          aria-label="Fermer"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      }
    </div>
  `,
})
export class LokAlerteComponent {
  @Input({ required: true }) type!: TypeAlerte;
  @Input() message!: string;
  @Input() titre?: string;
  @Input() dismissible: boolean = false;
  @Output() closed = new EventEmitter<void>();

  /**
   * Retourne les classes CSS pour le conteneur
   */
  containerClasses = computed(() => {
    const baseClasses = {
      info: "bg-blue-50 border border-blue-200",
      warning: "bg-orange-50 border border-orange-200",
      error: "bg-red-50 border border-red-200",
      success: "bg-green-50 border border-green-200",
    };
    return baseClasses[this.type];
  });

  /**
   * Retourne les classes CSS pour le conteneur de l'icône
   */
  iconContainerClasses = computed(() => {
    const iconClasses = {
      info: "bg-blue-100 text-blue-600",
      warning: "bg-orange-100 text-orange-600",
      error: "bg-red-100 text-red-600",
      success: "bg-green-100 text-green-600",
    };
    return iconClasses[this.type];
  });

  /**
   * Retourne les classes CSS pour l'icône
   */
  iconClasses = computed(() => {
    return "text-current";
  });

  /**
   * Retourne le chemin SVG de l'icône selon le type
   */
  iconPath = computed(() => {
    const paths = {
      info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      warning:
        "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
      error:
        "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
      success: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    };
    return paths[this.type];
  });

  /**
   * Retourne les classes CSS pour le titre
   */
  titleClasses = computed(() => {
    const titleClasses = {
      info: "text-blue-900",
      warning: "text-orange-900",
      error: "text-red-900",
      success: "text-green-900",
    };
    return titleClasses[this.type];
  });

  /**
   * Retourne les classes CSS pour le message
   */
  messageClasses = computed(() => {
    const messageClasses = {
      info: "text-blue-700",
      warning: "text-orange-700",
      error: "text-red-700",
      success: "text-green-700",
    };
    return messageClasses[this.type];
  });
}

/*
 * Exemple d'utilisation :
 *
 * <lok-alerte type="info" message="Votre bien a été ajouté avec succès"></lok-alerte>
 *
 * Avec titre et dismissible :
 * <lok-alerte
 *   type="warning"
 *   titre="Attention"
 *   message="Ce bien est actuellement vacant"
 *   [dismissible]="true"
 *   (closed)="closeAlert()"
 * ></lok-alerte>
 *
 * Erreur :
 * <lok-alerte type="error" message="Une erreur est survenue lors de la sauvegarde"></lok-alerte>
 *
 * Succès :
 * <lok-alerte type="success" message="Paiement enregistré avec succès"></lok-alerte>
 */

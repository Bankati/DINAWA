import { Component, Input, computed } from '@angular/core';

export type SkeletonType = 'card' | 'list' | 'text' | 'avatar' | 'button';

@Component({
  selector: 'lok-skeleton',
  standalone: true,
  template: `
    <div [class]="containerClasses()" class="animate-pulse">
      @switch (type) {
        @case ('card') {
          <div class="space-y-4">
            <!-- Skeleton image -->
            <div class="h-48 bg-gray-200 rounded-lg"></div>
            <!-- Skeleton titre -->
            <div class="h-6 bg-gray-200 rounded w-3/4"></div>
            <!-- Skeleton adresse -->
            <div class="h-4 bg-gray-200 rounded w-1/2"></div>
            <!-- Skeleton loyer -->
            <div class="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        }
        @case ('list') {
          <div class="space-y-4">
            @for (item of items(); track item) {
              <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <!-- Skeleton avatar/image -->
                <div class="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0"></div>
                <!-- Skeleton contenu -->
                <div class="flex-1 space-y-2">
                  <div class="h-5 bg-gray-200 rounded w-1/2"></div>
                  <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div class="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            }
          </div>
        }
        @case ('text') {
          <div class="space-y-2">
            @for (item of items(); track item) {
              <div [class]="'h-4 bg-gray-200 rounded ' + widthClasses()"></div>
            }
          </div>
        }
        @case ('avatar') {
          <div [style]="avatarSizeClasses()" class="bg-gray-200 rounded-full"></div>
        }
        @case ('button') {
          <div class="h-12 bg-gray-200 rounded-lg w-full"></div>
        }
      }
    </div>
  `,
})
export class LokSkeletonComponent {
  @Input() type: SkeletonType = 'text';
  @Input() count: number = 3;
  @Input() width: 'full' | 'half' | 'third' | 'quarter' = 'full';
  @Input() avatarSize: 'sm' | 'md' | 'lg' = 'md';

  /**
   * Crée un tableau itérable pour les boucles @for
   */
  items = computed(() => Array.from({ length: this.count }, (_, i) => i));

  /**
   * Retourne les classes CSS pour le conteneur
   */
  containerClasses = computed(() => {
    return 'rounded-lg';
  });

  /**
   * Retourne les classes CSS pour la largeur du texte
   */
  widthClasses = computed(() => {
    const widthMap = {
      full: 'w-full',
      half: 'w-1/2',
      third: 'w-1/3',
      quarter: 'w-1/4'
    };
    return widthMap[this.width];
  });

  /**
   * Retourne les styles CSS pour la taille de l'avatar
   */
  avatarSizeClasses = computed(() => {
    const sizeMap = {
      sm: 'width: 32px; height: 32px;',
      md: 'width: 48px; height: 48px;',
      lg: 'width: 64px; height: 64px;'
    };
    return sizeMap[this.avatarSize];
  });
}

/*
 * Exemple d'utilisation :
 * 
 * Skeleton pour une card de bien :
 * <lok-skeleton type="card"></lok-skeleton>
 * 
 * Skeleton pour une liste :
 * <lok-skeleton type="list" [count]="5"></lok-skeleton>
 * 
 * Skeleton pour du texte :
 * <lok-skeleton type="text" [count]="4" width="half"></lok-skeleton>
 * 
 * Skeleton pour un avatar :
 * <lok-skeleton type="avatar" avatarSize="lg"></lok-skeleton>
 * 
 * Skeleton pour un bouton :
 * <lok-skeleton type="button"></lok-skeleton>
 */

import { Component, Input, computed } from '@angular/core';
import { FcfaPipe } from '../../pipes/fcfa.pipe';

@Component({
  selector: 'lok-montant-fcfa',
  standalone: true,
  imports: [FcfaPipe],
  template: `
    <span [class]="classes()" class="font-bold">
      {{ montant | fcfa }}
    </span>
  `,
})
export class LokMontantFcfaComponent {
  @Input({ required: true }) montant!: number | string;
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() color: 'default' | 'primary' | 'success' | 'error' = 'default';

  /**
   * Retourne les classes CSS en fonction de la taille et de la couleur
   */
  classes = computed(() => {
    const sizeClasses = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl'
    };

    const colorClasses = {
      default: 'text-gray-900',
      primary: 'text-primary',
      success: 'text-success',
      error: 'text-error'
    };

    return `${sizeClasses[this.size]} ${colorClasses[this.color]}`;
  });
}

/*
 * Exemple d'utilisation :
 * 
 * <lok-montant-fcfa [montant]="150000"></lok-montant-fcfa>
 * <lok-dontant-fcfa [montant]="loyer" size="lg" color="primary"></lok-montant-fcfa>
 * <lok-montant-fcfa [montant]="total" size="xl" color="success"></lok-montant-fcfa>
 */

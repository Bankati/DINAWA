import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe pour formater un montant en FCFA avec séparateur de milliers
 * Exemple : 150000 -> "150 000 FCFA"
 */
@Pipe({
  name: 'fcfa',
  standalone: true
})
export class FcfaPipe implements PipeTransform {
  transform(value: number | string): string {
    if (value === null || value === undefined) {
      return '0 FCFA';
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue)) {
      return '0 FCFA';
    }

    // Formater avec séparateur de milliers (espace)
    const formatted = numValue.toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    return `${formatted} FCFA`;
  }
}

/*
 * Exemple d'utilisation dans un template :
 * 
 * {{ 150000 | fcfa }}  // Affiche : "150 000 FCFA"
 * {{ montant | fcfa }}  // Affiche le montant formaté
 */

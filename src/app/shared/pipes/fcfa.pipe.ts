import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'fcfa', standalone: true })
export class FcfaPipe implements PipeTransform {
  transform(value: number | string): string {
    if (value === null || value === undefined) return '0 FCFA';

    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '0 FCFA';

    // Formater manuellement avec espace ordinaire comme séparateur de milliers
    // (évite la variabilité de toLocaleString selon l'environnement Node/navigateur)
    const rounded = Math.round(numValue);
    const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    return `${formatted} FCFA`;
  }
}

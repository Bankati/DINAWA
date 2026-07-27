import { Pipe, PipeTransform } from '@angular/core';

export type LokDateFormat = 'datetime' | 'date' | 'time' | 'month' | 'long';

/**
 * Pipe timezone-aware pour toutes les dates WARAH.
 * Utilise le fuseau horaire du navigateur de l'utilisateur (Intl API).
 *
 * Usage :
 *   {{ date | lokDate }}            → 21/07/2026, 14:30  (action = date + heure)
 *   {{ date | lokDate:'date' }}     → 21/07/2026          (date calendaire)
 *   {{ date | lokDate:'time' }}     → 14:30               (heure seule)
 *   {{ date | lokDate:'month' }}    → juillet 2026         (mois + année)
 *   {{ date | lokDate:'long' }}     → lundi 21 juillet 2026
 */
@Pipe({ name: 'lokDate', standalone: true, pure: true })
export class LokDatePipe implements PipeTransform {
  private readonly tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  transform(value: Date | string | null | undefined, format: LokDateFormat = 'datetime'): string {
    if (value === null || value === undefined || value === '') return '—';
    const d = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(d.getTime())) return '—';

    const base: Intl.DateTimeFormatOptions = { timeZone: this.tz };

    switch (format) {
      case 'datetime':
        return new Intl.DateTimeFormat('fr-FR', {
          ...base,
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }).format(d);

      case 'date':
        return new Intl.DateTimeFormat('fr-FR', {
          ...base,
          day: '2-digit', month: '2-digit', year: 'numeric',
        }).format(d);

      case 'time':
        return new Intl.DateTimeFormat('fr-FR', {
          ...base,
          hour: '2-digit', minute: '2-digit',
        }).format(d);

      case 'month':
        return new Intl.DateTimeFormat('fr-FR', {
          ...base,
          month: 'long', year: 'numeric',
        }).format(d);

      case 'long':
        return new Intl.DateTimeFormat('fr-FR', {
          ...base,
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        }).format(d);
    }
  }
}

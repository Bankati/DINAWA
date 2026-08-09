import { DashboardPeriodType } from './dashboard.types';

export interface ResolvedPeriod {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  label: string;
}

// Calcul en arithmétique UTC pure (Date.UTC), jamais via les fonctions
// calendaires date-fns (startOfMonth/endOfMonth/subMonths...) qui lisent les
// champs LOCAUX de l'horloge du process — un décalage de fuseau ferait
// glisser les bornes d'un mois entier (voir /review unité 32). Lomé est
// UTC+0 sans DST, mais architecture.md demande de rester explicite plutôt
// que de compter sur une coïncidence d'environnement.
export function resolvePeriod(dto: {
  period?: DashboardPeriodType;
  month?: number;
  year?: number;
}): ResolvedPeriod {
  const now = new Date();
  const period = dto.period ?? DashboardPeriodType.MONTH;
  const year = dto.year ?? now.getUTCFullYear();

  if (period === DashboardPeriodType.YEAR) {
    return {
      start: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
      end: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
      previousStart: new Date(Date.UTC(year - 1, 0, 1, 0, 0, 0, 0)),
      previousEnd: new Date(Date.UTC(year - 1, 11, 31, 23, 59, 59, 999)),
      label: String(year),
    };
  }

  const monthIndex = (dto.month ?? now.getUTCMonth() + 1) - 1;
  // day: 0 du mois suivant = dernier jour du mois courant (arithmétique
  // Date.UTC native, aucune fonction calendaire tierce nécessaire).
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
  const previousEnd = new Date(Date.UTC(year, monthIndex, 0, 23, 59, 59, 999));
  return {
    start: new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0)),
    end,
    previousStart: new Date(Date.UTC(year, monthIndex - 1, 1, 0, 0, 0, 0)),
    previousEnd,
    label: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
  };
}

export function computeChangePercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

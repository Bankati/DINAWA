import { computeChangePercent, resolvePeriod } from './period';
import { DashboardPeriodType } from './dashboard.types';

describe('resolvePeriod', () => {
  it('calcule les bornes UTC exactes pour un mois en milieu d’année', () => {
    const result = resolvePeriod({ period: DashboardPeriodType.MONTH, month: 8, year: 2026 });

    expect(result.start.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(result.end.toISOString()).toBe('2026-08-31T23:59:59.999Z');
    expect(result.previousStart.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(result.previousEnd.toISOString()).toBe('2026-07-31T23:59:59.999Z');
    expect(result.label).toBe('2026-08');
  });

  it('bascule correctement sur décembre de l’année précédente pour janvier', () => {
    const result = resolvePeriod({ period: DashboardPeriodType.MONTH, month: 1, year: 2026 });

    expect(result.start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(result.previousStart.toISOString()).toBe('2025-12-01T00:00:00.000Z');
    expect(result.previousEnd.toISOString()).toBe('2025-12-31T23:59:59.999Z');
  });

  it('calcule correctement la fin de décembre', () => {
    const result = resolvePeriod({ period: DashboardPeriodType.MONTH, month: 12, year: 2026 });
    expect(result.end.toISOString()).toBe('2026-12-31T23:59:59.999Z');
  });

  it('gère février d’une année bissextile (29 jours)', () => {
    const result = resolvePeriod({ period: DashboardPeriodType.MONTH, month: 2, year: 2028 });
    expect(result.end.toISOString()).toBe('2028-02-29T23:59:59.999Z');
  });

  it('gère février d’une année non bissextile (28 jours)', () => {
    const result = resolvePeriod({ period: DashboardPeriodType.MONTH, month: 2, year: 2026 });
    expect(result.end.toISOString()).toBe('2026-02-28T23:59:59.999Z');
  });

  it('calcule les bornes UTC exactes pour une année, avec comparaison à l’année précédente', () => {
    const result = resolvePeriod({ period: DashboardPeriodType.YEAR, year: 2026 });

    expect(result.start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(result.end.toISOString()).toBe('2026-12-31T23:59:59.999Z');
    expect(result.previousStart.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    expect(result.previousEnd.toISOString()).toBe('2025-12-31T23:59:59.999Z');
    expect(result.label).toBe('2026');
  });
});

describe('computeChangePercent', () => {
  it('renvoie null si la période précédente est à zéro et la courante non nulle (variation non mesurable)', () => {
    expect(computeChangePercent(100, 0)).toBeNull();
  });

  it('renvoie 0 si les deux périodes sont à zéro', () => {
    expect(computeChangePercent(0, 0)).toBe(0);
  });

  it('calcule un pourcentage arrondi à une décimale', () => {
    expect(computeChangePercent(150, 100)).toBe(50);
    expect(computeChangePercent(133, 100)).toBe(33);
  });
});

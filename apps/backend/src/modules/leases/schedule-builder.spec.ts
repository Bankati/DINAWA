import { buildScheduleEntries } from './schedule-builder';

describe('buildScheduleEntries', () => {
  it('génère 3 échéances mensuelles pour un bail de 3 mois à durée fixe', () => {
    const entries = buildScheduleEntries(
      'lease-1',
      new Date('2026-01-01'),
      new Date('2026-04-01'),
      'MONTHLY',
      50000,
      5000,
    );

    expect(entries).toHaveLength(3);
    expect(entries[0].expectedAmount).toBe(55000); // (50000+5000) * 1
    expect(entries[0].periodStart).toEqual(new Date('2026-01-01'));
    expect(entries[0].dueDate).toEqual(new Date('2026-01-01'));
    expect(entries[2].periodStart).toEqual(new Date('2026-03-01'));
  });

  it('génère 2 échéances trimestrielles pour un bail de 6 mois — montant = loyer total × 3 mois', () => {
    const entries = buildScheduleEntries(
      'lease-1',
      new Date('2026-01-01'),
      new Date('2026-07-01'),
      'QUARTERLY',
      50000,
      5000,
    );

    expect(entries).toHaveLength(2);
    expect(entries[0].expectedAmount).toBe(165000); // (50000+5000) * 3
  });

  it('génère 12 échéances mensuelles pour un bail ouvert (fenêtre glissante de 12 mois)', () => {
    const entries = buildScheduleEntries(
      'lease-1',
      new Date('2026-01-01'),
      new Date('2027-01-01'),
      'MONTHLY',
      50000,
      5000,
    );

    expect(entries).toHaveLength(12);
  });

  it('associe chaque échéance au leaseId fourni', () => {
    const entries = buildScheduleEntries(
      'lease-42',
      new Date('2026-01-01'),
      new Date('2026-02-01'),
      'MONTHLY',
      50000,
      0,
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].leaseId).toBe('lease-42');
  });
});

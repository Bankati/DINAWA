import { computeTenantFee } from './payment-fees';

describe('computeTenantFee', () => {
  it('vaut 0 quand aucun frais configuré (WARAH absorbe tout)', () => {
    expect(computeTenantFee(50_000, { percent: 0, fixedFcfa: 0 })).toBe(0);
  });

  it('applique le pourcentage arrondi à l’entier supérieur', () => {
    // 1,5 % de 50 001 = 750,015 → 751 (jamais moins que le coût réel)
    expect(computeTenantFee(50_001, { percent: 1.5, fixedFcfa: 0 })).toBe(751);
    expect(computeTenantFee(50_000, { percent: 1.5, fixedFcfa: 0 })).toBe(750);
  });

  it('ajoute le montant fixe au pourcentage', () => {
    expect(computeTenantFee(50_000, { percent: 1, fixedFcfa: 100 })).toBe(600);
  });

  it('ne facture rien sur un loyer nul ou négatif', () => {
    expect(computeTenantFee(0, { percent: 2, fixedFcfa: 100 })).toBe(0);
    expect(computeTenantFee(-5, { percent: 2, fixedFcfa: 100 })).toBe(0);
  });

  it('ne renvoie jamais un frais négatif', () => {
    expect(computeTenantFee(1000, { percent: 0, fixedFcfa: -50 })).toBe(0);
  });
});

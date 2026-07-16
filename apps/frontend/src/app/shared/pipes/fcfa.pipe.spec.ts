import { FcfaPipe } from './fcfa.pipe';

describe('FcfaPipe', () => {
  let pipe: FcfaPipe;

  beforeEach(() => {
    pipe = new FcfaPipe();
  });

  it('formate un entier en FCFA avec séparateur de milliers', () => {
    expect(pipe.transform(150000)).toBe('150 000 FCFA');
  });

  it('formate zéro', () => {
    expect(pipe.transform(0)).toBe('0 FCFA');
  });

  it('formate une chaîne numérique', () => {
    expect(pipe.transform('75000')).toBe('75 000 FCFA');
  });

  it('retourne "0 FCFA" pour null', () => {
    expect(pipe.transform(null as any)).toBe('0 FCFA');
  });

  it('retourne "0 FCFA" pour undefined', () => {
    expect(pipe.transform(undefined as any)).toBe('0 FCFA');
  });

  it('retourne "0 FCFA" pour une chaîne non-numérique', () => {
    expect(pipe.transform('abc')).toBe('0 FCFA');
  });

  it('formate sans décimales même pour un float', () => {
    // Les montants FCFA n'ont pas de sous-unité
    expect(pipe.transform(50000.99)).toBe('50 001 FCFA');
  });

  it('formate les grands montants', () => {
    expect(pipe.transform(1500000)).toBe('1 500 000 FCFA');
  });
});

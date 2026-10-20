import { toWhatsappNumber } from './phone';

describe('toWhatsappNumber', () => {
  it.each([
    ['90112233', '22890112233'],
    ['+228 90 11 22 33', '22890112233'],
    ['00228-90.11.22.33', '22890112233'],
    ['22890112233', '22890112233'],
  ])('ramène %s au format Meta', (input, expected) => {
    expect(toWhatsappNumber(input)).toBe(expected);
  });

  it.each([
    ['numéro trop court', '9011223'],
    ['numéro étranger', '+33612345678'],
    ['texte', 'abc'],
    ['vide', ''],
  ])('refuse un %s', (_label, input) => {
    expect(toWhatsappNumber(input)).toBeNull();
  });

  it('refuse null et undefined', () => {
    expect(toWhatsappNumber(null)).toBeNull();
    expect(toWhatsappNumber(undefined)).toBeNull();
  });
});

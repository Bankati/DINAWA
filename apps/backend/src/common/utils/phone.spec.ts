import { fromWhatsappNumber, storedPhoneVariants, toWhatsappNumber } from './phone';

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

describe('storedPhoneVariants (/review unité 44)', () => {
  it('donne toutes les formes sous lesquelles un numéro peut être enregistré', () => {
    expect(storedPhoneVariants('90000001')).toEqual(['90000001', '22890000001', '+22890000001', '0022890000001']);
  });
});

describe('fromWhatsappNumber (expéditeur reçu par le webhook, unité 44)', () => {
  it('ramène un numéro togolais Meta à ses 8 chiffres', () => {
    expect(fromWhatsappNumber('22898646779')).toEqual({ local: '98646779', digits: '22898646779' });
  });

  it('accepte un + éventuel', () => {
    expect(fromWhatsappNumber('+22890004343').local).toBe('90004343');
  });

  it.each([
    ['numéro français', '33612345678'],
    ['numéro togolais tronqué', '2289864677'],
    ['numéro américain de test Meta', '15556537424'],
  ])('ne donne aucune forme locale pour un %s', (_label, input) => {
    const result = fromWhatsappNumber(input);
    expect(result.local).toBeNull();
    expect(result.digits).toBe(input);
  });
});

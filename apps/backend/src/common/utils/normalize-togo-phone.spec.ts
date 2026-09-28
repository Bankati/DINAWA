import { normalizeTogoPhone } from './normalize-togo-phone';

describe('normalizeTogoPhone', () => {
  it.each([
    ['90330557', '90330557'],
    ['+228 90 33 05 57', '90330557'],
    ['00228-90.33.05.57', '90330557'],
    ['22890330557', '90330557'],
    [' (90) 33 05 57 ', '90330557'],
  ])('ramène %s à 8 chiffres locaux', (input, expected) => {
    expect(normalizeTogoPhone(input)).toBe(expected);
  });

  it('laisse un numéro non togolais reconnaissable pour que la validation le rejette', () => {
    expect(normalizeTogoPhone('771111111')).toBe('771111111');
    expect(normalizeTogoPhone('abc')).toBe('abc');
  });

  it('ne touche pas une valeur qui n’est pas une chaîne', () => {
    expect(normalizeTogoPhone(90330557)).toBe(90330557);
    expect(normalizeTogoPhone(undefined)).toBeUndefined();
  });
});

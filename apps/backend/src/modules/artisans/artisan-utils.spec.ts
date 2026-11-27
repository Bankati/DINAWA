import { maskPhone, normalizeZone, normalizeZones, shortName, supportReference } from './artisan-utils';

describe('artisan-utils', () => {
  it('normalise un quartier (espaces, majuscule initiale)', () => {
    expect(normalizeZone('  tokoin   ramco ')).toBe('Tokoin ramco');
    expect(normalizeZone('bè')).toBe('Bè');
  });

  it('dédoublonne les quartiers sans tenir compte de la casse', () => {
    expect(normalizeZones(['Bè', 'bè', ' Tokoin', '', '  '])).toEqual(['Bè', 'Tokoin']);
    expect(normalizeZones(undefined)).toEqual([]);
  });

  it('masque le numéro (2 premiers et 2 derniers chiffres seulement)', () => {
    expect(maskPhone('90123456')).toBe('90 •• •• 56');
    expect(maskPhone('123')).toBe('•• •• •• ••');
  });

  it("n'affiche que l'initiale du nom de famille", () => {
    expect(shortName('Ama', 'Mensah')).toBe('Ama M.');
  });

  it('fabrique une référence SR- de 6 caractères sans 0/O ni 1/I', () => {
    const ref = supportReference();
    expect(ref).toMatch(/^SR-[A-HJ-NP-Z2-9]{6}$/);
    expect(supportReference(() => 0)).toBe('SR-AAAAAA');
  });
});

import { parseAllowedOrigins } from './parse-allowed-origins';

describe('parseAllowedOrigins', () => {
  it('découpe une liste séparée par des virgules', () => {
    expect(parseAllowedOrigins('https://a.com,https://b.com')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('ignore les espaces autour des entrées (cas réel : ", " après la virgule)', () => {
    expect(parseAllowedOrigins('https://a.com, https://www.b.com ')).toEqual([
      'https://a.com',
      'https://www.b.com',
    ]);
  });

  it('retire le "/" final, que le navigateur n\'envoie jamais dans Origin', () => {
    expect(parseAllowedOrigins('https://a.com/,https://b.com//')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('ignore les entrées vides (virgule finale, doublon de virgules)', () => {
    expect(parseAllowedOrigins('https://a.com,,https://b.com,')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('retombe sur localhost quand la variable est absente ou vide', () => {
    expect(parseAllowedOrigins(undefined)).toEqual(['http://localhost:4300']);
    expect(parseAllowedOrigins('')).toEqual(['http://localhost:4300']);
    expect(parseAllowedOrigins(' , ')).toEqual(['http://localhost:4300']);
  });
});

import { MENU_ROWS, formatMonth, parseBotChoice } from './bot-messages';

describe('parseBotChoice (unité 47)', () => {
  it.each([
    ['PAY', 'PAY'],
    ['RECEIPT', 'RECEIPT'],
    ['STATEMENT', 'STATEMENT'],
  ] as const)('choix du menu cliquable %s', (replyId, expected) => {
    expect(parseBotChoice(null, replyId)).toBe(expected);
  });

  it.each([
    ['Menu', 'MENU'],
    ['bonjour !', 'MENU'],
    ['BJR', 'MENU'],
    ['Payer', 'PAY'],
    ['payer mon loyer', 'PAY'],
    ['1', 'PAY'],
    ['Quittance', 'RECEIPT'],
    ['Ma dernière quittance', 'RECEIPT'],
    ['2', 'RECEIPT'],
    ['Relevé', 'STATEMENT'],
    ['mon releve.', 'STATEMENT'],
    ['3', 'STATEMENT'],
  ])('mot tapé « %s » → %s', (text, expected) => {
    expect(parseBotChoice(text, null)).toBe(expected);
  });

  it.each([
    'ma fenêtre est cassée',
    'je paierai demain',
    'quittance de septembre svp',
    '583920',
    '',
    'payer payer',
  ])('phrase libre « %s » : non reconnue (pas d’intelligence artificielle)', (text) => {
    expect(parseBotChoice(text, null)).toBeNull();
  });

  it('identifiant de menu inconnu : ignoré', () => {
    expect(parseBotChoice(null, 'DELETE_ALL')).toBeNull();
  });
});

describe('menu et formats', () => {
  it('respecte les limites Meta (titre 24, description 72 caractères, 10 lignes au plus)', () => {
    expect(MENU_ROWS.length).toBeLessThanOrEqual(10);
    for (const row of MENU_ROWS) {
      expect(row.title.length).toBeLessThanOrEqual(24);
      expect((row.description ?? '').length).toBeLessThanOrEqual(72);
    }
  });

  it('mois en français, majuscule, heure de Lomé', () => {
    expect(formatMonth(new Date('2026-10-01T00:00:00.000Z'))).toBe('Octobre 2026');
  });
});

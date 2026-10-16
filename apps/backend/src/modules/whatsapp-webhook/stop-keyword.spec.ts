import { isStopKeyword } from './stop-keyword';

describe('isStopKeyword', () => {
  it.each([
    'STOP',
    'Stop',
    'stop',
    'stop.',
    'STOP !',
    '  stop  ',
    'ARRÊT',
    'arret',
    'Arrêt.',
    'ARRÊTER',
    'arreter!!',
  ])('reconnaît « %s »', (text) => {
    expect(isStopKeyword(text)).toBe(true);
  });

  it.each([
    'Je paie demain, stop aux pénalités svp',
    'stop les messages svp',
    'stopper',
    'non stop',
    'arrêt de bus',
    'STOP WARAH',
    'st op',
    'Bonjour',
    '',
  ])('ne déclenche rien pour « %s »', (text) => {
    expect(isStopKeyword(text)).toBe(false);
  });

  it('accepte un texte absent', () => {
    expect(isStopKeyword(null)).toBe(false);
    expect(isStopKeyword(undefined)).toBe(false);
  });
});

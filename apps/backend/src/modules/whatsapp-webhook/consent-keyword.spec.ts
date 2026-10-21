import { parseConsentKeyword } from './consent-keyword';

describe('parseConsentKeyword', () => {
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
  ])('reconnaît STOP dans « %s »', (text) => {
    expect(parseConsentKeyword(text)).toBe('STOP');
  });

  it.each([
    'OUI',
    'oui',
    'Oui !',
    ' oui. ',
    "OUI, j'accepte de recevoir les messages de service WARAH sur WhatsApp",
    'OUI, j’accepte de recevoir les messages de service WARAH sur WhatsApp.',
    'oui,  j’accepte de recevoir les messages de service warah sur whatsapp',
  ])('reconnaît la confirmation dans « %s »', (text) => {
    expect(parseConsentKeyword(text)).toBe('CONFIRM');
  });

  it.each(['REPRENDRE', 'Reprendre', 'reprendre !', ' REPRENDRE. '])('reconnaît la reprise dans « %s »', (text) => {
    expect(parseConsentKeyword(text)).toBe('RESUME');
  });

  it.each([
    'Je paie demain, stop aux pénalités svp',
    'stop les messages svp',
    'stopper',
    'non stop',
    'arrêt de bus',
    'STOP WARAH',
    'st op',
    'oui je passe demain',
    'ouii',
    'ok',
    "d'accord",
    'reprendre le paiement',
    'je veux reprendre',
    'Bonjour',
    '',
  ])('ne déclenche rien pour « %s »', (text) => {
    expect(parseConsentKeyword(text)).toBeNull();
  });

  it('accepte un texte absent', () => {
    expect(parseConsentKeyword(null)).toBeNull();
    expect(parseConsentKeyword(undefined)).toBeNull();
  });
});

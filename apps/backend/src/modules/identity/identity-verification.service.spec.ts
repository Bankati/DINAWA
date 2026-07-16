import { createWorker } from 'tesseract.js';
import { IdentityVerificationService } from './identity-verification.service';

const mockRecognize = jest.fn();
const mockTerminate = jest.fn();

jest.mock('tesseract.js', () => ({
  createWorker: jest.fn(() =>
    Promise.resolve({ recognize: mockRecognize, terminate: mockTerminate }),
  ),
}));

// sharp n'est utilisé que pour faire pivoter le buffer entre deux tentatives
// OCR — sa vraie logique de décodage d'image n'a pas sa place dans ces tests
// unitaires (mockRecognize ignore le contenu du buffer reçu).
jest.mock('sharp', () =>
  jest.fn(() => ({
    rotate: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('rotated')),
  })),
);

// MRZ TD1 valide (checksums corrects, code pays TGO réel) — vérifié
// indépendamment avec la lib `mrz` avant d'écrire ce fixture.
const VALID_MRZ_LINES = [
  'I<TGOD23145890<1233<<<<<<<<<<<',
  '7408122F1204159TGO<<<<<<<<<<<2',
  'ERIKSSON<<ANNA<MARIA<<<<<<<<<<',
];
// Même MRZ avec un chiffre du numéro de document corrompu (check digit
// devenu incohérent) — doit basculer `valid` à false.
const INVALID_MRZ_LINES = [
  'I<TGOD23145891<1233<<<<<<<<<<<',
  '7408122F1204159TGO<<<<<<<<<<<2',
  'ERIKSSON<<ANNA<MARIA<<<<<<<<<<',
];

describe('IdentityVerificationService', () => {
  let service: IdentityVerificationService;

  const validFrontText = [
    'REPUBLIQUE TOGOLAISE',
    'MINISTERE CHARGE DE LA SECURITE',
    "CARTE NATIONALE D'IDENTITE",
    'Numéro: 0000-000-0000',
    'Nom: TEST',
  ].join('\n');

  beforeEach(() => {
    service = new IdentityVerificationService();
    mockRecognize.mockReset();
    mockTerminate.mockReset();
  });

  describe('verifyFront', () => {
    it('renvoie VERIFIED quand les marqueurs et le numéro sont présents', async () => {
      mockRecognize.mockResolvedValue({ data: { text: validFrontText } });

      const result = await service.verifyFront(Buffer.from('image'));

      expect(result.status).toBe('VERIFIED');
      expect(mockTerminate).toHaveBeenCalledTimes(1);
    });

    it("tolère un texte OCR accentué (le vrai imprimé ne l'est pas, mais l'OCR peut halluciner un accent)", async () => {
      const accented = validFrontText
        .replace('REPUBLIQUE', 'RÉPUBLIQUE')
        .replace("D'IDENTITE", "D'IDENTITÉ");
      mockRecognize.mockResolvedValue({ data: { text: accented } });

      const result = await service.verifyFront(Buffer.from('image'));

      expect(result.status).toBe('VERIFIED');
    });

    it('rejette quand un marqueur est manquant, même après avoir essayé les 4 rotations', async () => {
      mockRecognize.mockResolvedValue({ data: { text: 'TEXTE SANS RAPPORT AVEC UNE CNI' } });

      const result = await service.verifyFront(Buffer.from('image'));

      expect(result.status).toBe('REJECTED');
      expect(result.status === 'REJECTED' && result.reason).toContain('Marqueurs manquants');
      expect(mockRecognize).toHaveBeenCalledTimes(4);
    });

    it('retente une autre rotation si la première orientation ne matche pas (carte photographiée de travers)', async () => {
      mockRecognize
        .mockResolvedValueOnce({ data: { text: 'TEXTE ILLISIBLE CAR CARTE TOURNEE A 90 DEGRES' } })
        .mockResolvedValueOnce({ data: { text: validFrontText } });

      const result = await service.verifyFront(Buffer.from('image'));

      expect(result.status).toBe('VERIFIED');
      expect(mockRecognize).toHaveBeenCalledTimes(2);
    });

    it('rejette quand le numéro de CNI est absent ou mal formé', async () => {
      const withoutNumber = validFrontText.replace('0000-000-0000', '123456');
      mockRecognize.mockResolvedValue({ data: { text: withoutNumber } });

      const result = await service.verifyFront(Buffer.from('image'));

      expect(result.status).toBe('REJECTED');
      expect(result.status === 'REJECTED' && result.reason).toContain('Numéro de CNI');
    });

    it('termine toujours le worker, même si la reconnaissance échoue', async () => {
      mockRecognize.mockRejectedValue(new Error('boom'));

      await expect(service.verifyFront(Buffer.from('image'))).rejects.toThrow('boom');
      expect(mockTerminate).toHaveBeenCalledTimes(1);
    });

    it('fournit un errorHandler à createWorker — sans lui, une image corrompue fait planter tout le process Node (voir tesseract.js/createWorker.js, throw synchrone hors chemin promesse)', async () => {
      mockRecognize.mockResolvedValue({ data: { text: validFrontText } });

      await service.verifyFront(Buffer.from('image'));

      type CreateWorkerArgs = [string, undefined, { errorHandler?: unknown }];
      const [langs, oem, options] = (createWorker as jest.Mock).mock.calls[0] as CreateWorkerArgs;
      expect(langs).toBe('fra+eng');
      expect(oem).toBeUndefined();
      expect(typeof options.errorHandler).toBe('function');
    });
  });

  describe('verifyBack', () => {
    const backTextWithContact = [
      'Taille: 1,71 Groupe sanguin: O+',
      'Signes particuliers: NEANT',
      'Personne à prévenir: TESTA,TESTB TESTC,TESTVILLE,90000000',
    ].join('\n');

    it('extrait la ligne « Personne à prévenir » et le téléphone (dernier groupe de 8 chiffres)', async () => {
      mockRecognize.mockResolvedValue({ data: { text: backTextWithContact } });

      const result = await service.verifyBack(Buffer.from('image'));

      expect(result.emergencyContactRaw).toBe('TESTA,TESTB TESTC,TESTVILLE,90000000');
      expect(result.emergencyContactPhone).toBe('90000000');
      expect(mockTerminate).toHaveBeenCalledTimes(1);
    });

    it("tolère l'absence d'accent et de « : » sur le label", async () => {
      const text = 'Personne a prevenir TESTA,TESTVILLE,90000000';
      mockRecognize.mockResolvedValue({ data: { text } });

      const result = await service.verifyBack(Buffer.from('image'));

      expect(result.emergencyContactPhone).toBe('90000000');
    });

    it('prend le dernier groupe de 8 chiffres si plusieurs sont présents sur la ligne', async () => {
      const text = 'Personne à prévenir: 12345678 TESTA,TESTVILLE,90000000';
      mockRecognize.mockResolvedValue({ data: { text } });

      const result = await service.verifyBack(Buffer.from('image'));

      expect(result.emergencyContactPhone).toBe('90000000');
    });

    it('retente une autre rotation si la ligne « Personne à prévenir » est illisible à la première tentative', async () => {
      mockRecognize
        .mockResolvedValueOnce({ data: { text: 'TEXTE ILLISIBLE CAR VERSO TOURNE A 90 DEGRES' } })
        .mockResolvedValueOnce({ data: { text: backTextWithContact } });

      const result = await service.verifyBack(Buffer.from('image'));

      expect(result.emergencyContactPhone).toBe('90000000');
      expect(mockRecognize).toHaveBeenCalledTimes(2);
    });

    it("renvoie des champs vides (jamais d'exception) si la ligne n'est trouvée sur aucune des 4 rotations", async () => {
      mockRecognize.mockResolvedValue({ data: { text: 'TEXTE SANS AUCUN RAPPORT' } });

      const result = await service.verifyBack(Buffer.from('image'));

      expect(result.emergencyContactRaw).toBeNull();
      expect(result.emergencyContactPhone).toBeNull();
      expect(mockRecognize).toHaveBeenCalledTimes(4);
    });

    it('calcule mrzChecksumValid=true quand les 3 lignes MRZ sont localisées et cohérentes', async () => {
      const text = [backTextWithContact, ...VALID_MRZ_LINES].join('\n');
      mockRecognize.mockResolvedValue({ data: { text } });

      const result = await service.verifyBack(Buffer.from('image'));

      expect(result.mrzChecksumValid).toBe(true);
    });

    it('calcule mrzChecksumValid=false sans jamais impacter les autres champs quand la MRZ est corrompue', async () => {
      const text = [backTextWithContact, ...INVALID_MRZ_LINES].join('\n');
      mockRecognize.mockResolvedValue({ data: { text } });

      const result = await service.verifyBack(Buffer.from('image'));

      expect(result.mrzChecksumValid).toBe(false);
      expect(result.emergencyContactPhone).toBe('90000000');
    });

    it('renvoie mrzChecksumValid=null (signal absent, jamais une exception) quand la MRZ ne peut pas être localisée', async () => {
      mockRecognize.mockResolvedValue({ data: { text: backTextWithContact } });

      const result = await service.verifyBack(Buffer.from('image'));

      expect(result.mrzChecksumValid).toBeNull();
    });

    it('termine toujours le worker même si la reconnaissance échoue', async () => {
      mockRecognize.mockRejectedValue(new Error('boom'));

      await expect(service.verifyBack(Buffer.from('image'))).rejects.toThrow('boom');
      expect(mockTerminate).toHaveBeenCalledTimes(1);
    });
  });
});

// class-transformer/class-validator lisent les décorateurs via Reflect ; en
// exécution normale Nest le charge, pas dans un test isolé de ce module.
import 'reflect-metadata';
import { validate } from './env.validation';

// Jeu minimal de variables obligatoires — sert de base à chaque cas.
const BASE_ENV = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  DIRECT_URL: 'postgresql://u:p@localhost:5432/db',
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  JWT_SECRET: 'jwt-secret',
  RESEND_API_KEY: 'resend',
  RESEND_FROM_EMAIL: 'noreply@warah.tg',
  CONTACT_RECIPIENT_EMAIL: 'contact@warah.tg',
  VAPID_PUBLIC_KEY: 'pub',
  VAPID_PRIVATE_KEY: 'priv',
  VAPID_SUBJECT: 'mailto:contact@warah.tg',
  FRONTEND_URL: 'http://localhost:3000',
  INVITATION_TOKEN_SECRET: 'invitation-secret',
  PAY_LINK_SECRET: 'pay-link-secret',
};

describe('validate (frais de service payés par le locataire)', () => {
  it('vaut 0 par défaut : WARAH absorbe les frais tant que rien n’est configuré', () => {
    const config = validate({ ...BASE_ENV });

    expect(config.TENANT_FEE_PERCENT).toBe(0);
    expect(config.TENANT_FEE_FIXED_FCFA).toBe(0);
  });

  it('convertit les valeurs texte de Railway en nombres, décimales comprises', () => {
    const config = validate({
      ...BASE_ENV,
      TENANT_FEE_PERCENT: '1.5',
      TENANT_FEE_FIXED_FCFA: '100',
    });

    expect(config.TENANT_FEE_PERCENT).toBe(1.5);
    expect(config.TENANT_FEE_FIXED_FCFA).toBe(100);
  });

  it('traite une variable laissée vide comme absente (défaut 0)', () => {
    const config = validate({ ...BASE_ENV, TENANT_FEE_PERCENT: '', TENANT_FEE_FIXED_FCFA: '' });

    expect(config.TENANT_FEE_PERCENT).toBe(0);
    expect(config.TENANT_FEE_FIXED_FCFA).toBe(0);
  });

  it.each([
    ['un pourcentage négatif', { TENANT_FEE_PERCENT: '-1' }],
    ['un pourcentage aberrant (> 20)', { TENANT_FEE_PERCENT: '150' }],
    ['un pourcentage non numérique', { TENANT_FEE_PERCENT: 'beaucoup' }],
    ['un frais fixe négatif', { TENANT_FEE_FIXED_FCFA: '-50' }],
    ['un frais fixe décimal', { TENANT_FEE_FIXED_FCFA: '10.5' }],
    ['un frais fixe aberrant (> 10000)', { TENANT_FEE_FIXED_FCFA: '50000' }],
  ])(
    'refuse le démarrage avec %s (une faute de frappe ne doit pas facturer n’importe quoi)',
    (_label, extra) => {
      expect(() => validate({ ...BASE_ENV, ...extra })).toThrow(
        /Variables d'environnement invalides/,
      );
    },
  );
});

describe('validate (canal WhatsApp, phase 12)', () => {
  const WHATSAPP_ENV = {
    WHATSAPP_ENABLED: 'true',
    WHATSAPP_PHONE_NUMBER_ID: '123456789',
    WHATSAPP_ACCESS_TOKEN: 'token',
    WHATSAPP_APP_SECRET: 'app-secret',
    WHATSAPP_VERIFY_TOKEN: 'verify',
    WHATSAPP_GRAPH_VERSION: 'v23.0',
  };

  it('est éteint par défaut et démarre sans aucune variable WHATSAPP_*', () => {
    expect(validate({ ...BASE_ENV }).WHATSAPP_ENABLED).toBe(false);
  });

  it('lit la chaîne "false" comme éteint (jamais la conversion implicite en true)', () => {
    expect(validate({ ...BASE_ENV, WHATSAPP_ENABLED: 'false' }).WHATSAPP_ENABLED).toBe(false);
  });

  it('démarre allumé quand toutes les variables Meta sont présentes', () => {
    expect(validate({ ...BASE_ENV, ...WHATSAPP_ENV }).WHATSAPP_ENABLED).toBe(true);
  });

  it.each([
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_APP_SECRET',
    'WHATSAPP_VERIFY_TOKEN',
    'WHATSAPP_GRAPH_VERSION',
  ])('refuse de démarrer allumé sans %s', (missing) => {
    expect(() => validate({ ...BASE_ENV, ...WHATSAPP_ENV, [missing]: undefined })).toThrow(
      new RegExp(missing),
    );
  });

  it('refuse une version Graph mal formée', () => {
    expect(() =>
      validate({ ...BASE_ENV, ...WHATSAPP_ENV, WHATSAPP_GRAPH_VERSION: 'latest' }),
    ).toThrow(/WHATSAPP_GRAPH_VERSION/);
  });

  it('démarre sans PAY_LINK_SECRET tant que le lien de paiement n’existe pas (obligatoire à l’unité 43)', () => {
    expect(() => validate({ ...BASE_ENV, PAY_LINK_SECRET: undefined })).not.toThrow();
  });
});

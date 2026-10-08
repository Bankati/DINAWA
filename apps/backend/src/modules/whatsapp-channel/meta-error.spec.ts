import { classifyMetaError } from './meta-error';

type MetaErrorInput = { httpStatus: number | null; errorCode: number | null; errorSubcode: number | null };

const err = (
  httpStatus: number | null,
  errorCode: number | null = null,
  errorSubcode: number | null = null,
): MetaErrorInput => ({
  httpStatus,
  errorCode,
  errorSubcode,
});

describe('classifyMetaError', () => {
  it('classe UNKNOWN non réessayable quand aucune réponse n’est arrivée (timeout, coupure)', () => {
    expect(classifyMetaError(err(null))).toEqual({ status: 'UNKNOWN', retryable: false, alert: false });
  });

  it('classe FAILED réessayable une limite de débit (rien n’est parti, ça passera plus tard)', () => {
    expect(classifyMetaError(err(400, 130429))).toEqual({ status: 'FAILED', retryable: true, alert: false });
    expect(classifyMetaError(err(400, 131056))).toMatchObject({ status: 'FAILED', retryable: true });
  });

  it('classe FAILED définitif un destinataire sans WhatsApp', () => {
    expect(classifyMetaError(err(400, 131026))).toEqual({ status: 'FAILED', retryable: false, alert: false });
  });

  it('classe FAILED non réessayable avec alerte un jeton expiré', () => {
    expect(classifyMetaError(err(401, 190))).toEqual({ status: 'FAILED', retryable: false, alert: true });
  });

  it('couvre la plage des permissions 200-299', () => {
    expect(classifyMetaError(err(403, 230))).toMatchObject({ status: 'FAILED', alert: true });
  });

  it('classe UNKNOWN une erreur générique où Meta ne dit pas si le message est parti', () => {
    expect(classifyMetaError(err(400, 131000))).toMatchObject({ status: 'UNKNOWN', retryable: false });
  });

  it('classe UNKNOWN tout HTTP 5xx, même avec un code « indisponible » de la grille (pas de doublon)', () => {
    expect(classifyMetaError(err(503, 131016))).toEqual({ status: 'UNKNOWN', retryable: false, alert: false });
    expect(classifyMetaError(err(500, 2))).toMatchObject({ status: 'UNKNOWN', retryable: false });
    expect(classifyMetaError(err(502))).toMatchObject({ status: 'UNKNOWN', retryable: false });
  });

  it('applique la grille à un code « indisponible » reçu avec un 4xx : FAILED réessayable', () => {
    expect(classifyMetaError(err(400, 131016))).toEqual({ status: 'FAILED', retryable: true, alert: false });
  });

  it.each([
    ['un 2xx sans wamid', err(200)],
    ['un code absent de la grille', err(400, 999999)],
  ])('classe UNKNOWN non réessayable avec alerte %s', (_label, input) => {
    expect(classifyMetaError(input)).toEqual({ status: 'UNKNOWN', retryable: false, alert: true });
  });
});

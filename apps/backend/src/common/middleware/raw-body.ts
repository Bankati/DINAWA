import type { IncomingMessage } from 'node:http';

// Routes dont la signature se calcule sur les octets EXACTS reçus : un JSON
// ré-encodé (ordre des clés, espaces) ferait échouer la vérification (voir
// common/utils/meta-signature.ts, webhook WhatsApp, unité 44).
const RAW_BODY_PATHS = ['/api/webhooks/whatsapp'];

// Option `verify` de bodyParser.json : garde le corps brut uniquement pour
// ces routes (lu ensuite via RawBodyRequest.rawBody), pas pour toutes les
// requêtes — inutile de doubler la mémoire de chaque requête JSON.
export function keepRawBodyForSignedWebhooks(req: IncomingMessage, _res: unknown, buf: Buffer): void {
  // Barre finale tolérée : Express sert aussi `/api/webhooks/whatsapp/`, la
  // signature doit y être vérifiable de la même façon (/review unité 44).
  const path = req.url?.split('?')[0]?.replace(/\/+$/, '');
  if (path && RAW_BODY_PATHS.includes(path)) {
    (req as IncomingMessage & { rawBody?: Buffer }).rawBody = buf;
  }
}

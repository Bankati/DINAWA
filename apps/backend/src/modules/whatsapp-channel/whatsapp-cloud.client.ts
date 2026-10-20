import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, isAxiosError } from 'axios';
import { MetaApiError } from './meta-error';

const GRAPH_BASE_URL = 'https://graph.facebook.com';
const SEND_TIMEOUT_MS = 10_000;
// Un PDF de quittance pèse quelques dizaines de Ko, mais la liaison montante
// peut être lente : budget plus large que pour un simple envoi.
const UPLOAD_TIMEOUT_MS = 30_000;

export type TemplateComponent = Record<string, unknown>;

type SendMessageResponse = { messages?: { id?: string }[] };
type UploadMediaResponse = { id?: string };
type GraphErrorBody = { error?: { message?: string; code?: number; error_subcode?: number } };

// Seul point de contact HTTP avec l'API WhatsApp Cloud de Meta (unité 42).
// NON exporté par WhatsappChannelModule : les services métier passent
// toujours par WhatsappService, qui trace et classe chaque tentative.
// Aucune méthode ne réessaie : un envoi n'est pas idempotent chez Meta (pas
// de clé d'idempotence), un second appel après une réponse perdue enverrait
// le message deux fois — même règle que PaydunyaService.createInvoice().
// Toute erreur est normalisée en MetaApiError (httpStatus null = aucune
// réponse reçue), jamais une erreur axios brute.
@Injectable()
export class WhatsappCloudClient {
  private readonly http: AxiosInstance;

  constructor(config: ConfigService) {
    const version = config.get<string>('WHATSAPP_GRAPH_VERSION') ?? '';
    const phoneNumberId = config.get<string>('WHATSAPP_PHONE_NUMBER_ID') ?? '';
    this.http = axios.create({
      baseURL: `${GRAPH_BASE_URL}/${version}/${phoneNumberId}`,
      headers: { Authorization: `Bearer ${config.get<string>('WHATSAPP_ACCESS_TOKEN') ?? ''}` },
      timeout: SEND_TIMEOUT_MS,
    });
  }

  // `callbackData` (biz_opaque_callback_data, 512 caractères max) est renvoyé
  // par Meta dans les webhooks de statut : on y met l'id de la ligne
  // WhatsappMessage, ce qui permettra à l'unité 44 de rattacher un statut
  // « livré » à une tentative restée UNKNOWN.
  sendTemplate(params: {
    to: string;
    name: string;
    languageCode: string;
    components: TemplateComponent[];
    callbackData: string;
  }): Promise<string> {
    return this.postMessage({
      to: params.to,
      type: 'template',
      template: {
        name: params.name,
        language: { code: params.languageCode },
        components: params.components,
      },
      biz_opaque_callback_data: params.callbackData,
    });
  }

  sendText(params: { to: string; body: string; callbackData: string }): Promise<string> {
    return this.postMessage({
      to: params.to,
      type: 'text',
      text: { body: params.body, preview_url: false },
      biz_opaque_callback_data: params.callbackData,
    });
  }

  sendDocumentMessage(params: {
    to: string;
    mediaId: string;
    filename: string;
    callbackData: string;
  }): Promise<string> {
    return this.postMessage({
      to: params.to,
      type: 'document',
      document: { id: params.mediaId, filename: params.filename },
      biz_opaque_callback_data: params.callbackData,
    });
  }

  // Téléverse un fichier chez Meta et renvoie son identifiant média (valable
  // 30 jours côté Meta). N'envoie RIEN au destinataire à lui seul.
  async uploadMedia(params: { content: Buffer; mimeType: string; filename: string }): Promise<string> {
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', params.mimeType);
    form.append('file', new Blob([params.content], { type: params.mimeType }), params.filename);

    const data = await this.request<UploadMediaResponse>(() =>
      this.http.post('/media', form, { timeout: UPLOAD_TIMEOUT_MS }),
    );
    if (!data.id) throw new MetaApiError('Réponse Meta sans identifiant média', 200);
    return data.id;
  }

  private async postMessage(body: Record<string, unknown>): Promise<string> {
    const data = await this.request<SendMessageResponse>(() =>
      this.http.post('/messages', { messaging_product: 'whatsapp', recipient_type: 'individual', ...body }),
    );
    const wamid = data.messages?.[0]?.id;
    // 2xx sans wamid : réponse inexploitable, on ne sait pas si le message
    // est parti → classé UNKNOWN (code null, voir classifyMetaError).
    if (!wamid) throw new MetaApiError('Réponse Meta sans wamid', 200);
    return wamid;
  }

  private async request<T>(call: () => Promise<{ data: T }>): Promise<T> {
    try {
      return (await call()).data;
    } catch (error) {
      throw toMetaApiError(error);
    }
  }
}

function toMetaApiError(error: unknown): MetaApiError {
  if (!isAxiosError<GraphErrorBody>(error) || !error.response) {
    return new MetaApiError('Aucune réponse de Meta (timeout ou coupure réseau)', null);
  }
  const graphError = error.response.data?.error;
  return new MetaApiError(
    graphError?.message ?? `Erreur HTTP ${error.response.status} de Meta`,
    error.response.status,
    graphError?.code ?? null,
    graphError?.error_subcode ?? null,
  );
}

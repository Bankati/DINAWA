import { Injectable, Logger } from '@nestjs/common';
import { Prisma, WhatsappMessageStatus, WhatsappMessageType } from '@prisma/client';
import * as Sentry from '@sentry/nestjs';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappAccessRefusal, WhatsappAccessService } from './whatsapp-access.service';
import { TemplateComponent, WhatsappCloudClient } from './whatsapp-cloud.client';
import { MetaApiError, MetaErrorClassification, classifyMetaError } from './meta-error';

// Modèles Meta de catégorie Utilité prévus pour la phase 12 (textes dans le
// plan d'implémentation). Leur approbation se fait chez Meta, hors code.
export type WhatsappTemplateName =
  | 'rappel_loyer'
  | 'paiement_recu'
  | 'loyer_en_retard'
  | 'bienvenue_locataire';

const TEMPLATE_LANGUAGE = 'fr';
const ERROR_MESSAGE_MAX_LENGTH = 200;
const MEDIA_UPLOAD_UNCERTAIN = 'MEDIA_UPLOAD_UNCERTAIN';

// Un QUEUED plus vieux que ce délai signifie que le serveur s'est arrêté
// pendant l'appel à Meta : il doit être traité comme UNKNOWN et jamais
// renvoyé (utilisé par la tâche de renvoi, unité 46).
export const WHATSAPP_QUEUED_STALE_AFTER_MS = 10 * 60 * 1000;

type SendContext = {
  userId: string;
  // Événement déclencheur : 'payment-reminder', 'receipt', 'bot'...
  source: string;
  scheduleEntryId?: string;
  paymentId?: string;
};

type TemplateParams = {
  name: WhatsappTemplateName;
  bodyParams: string[];
  // Partie variable du bouton URL du modèle (ex. jeton du lien /payer).
  buttonParam?: string;
};

export type WhatsappSendInput = SendContext &
  ({ kind: 'template'; template: TemplateParams } | { kind: 'text'; text: string });

export type WhatsappDocumentInput = SendContext & {
  document: { content: Buffer; filename: string; mimeType: 'application/pdf' };
  // Avec modèle : document en en-tête d'un modèle approuvé (obligatoire hors
  // de la fenêtre de 24 h). Sans : simple message document (robot, unité 47).
  template?: Omit<TemplateParams, 'buttonParam'>;
};

export type WhatsappSendResult =
  | { outcome: 'REFUSED'; reason: WhatsappAccessRefusal }
  | { outcome: 'SENT'; messageId: string; wamid: string }
  | { outcome: 'FAILED' | 'UNKNOWN'; messageId: string; retryable: boolean };

// Seule porte d'envoi WhatsApp exposée aux services métier (unité 42,
// /architect 2026-10-08). Invariant d'appels : send() fait AU PLUS un appel
// à Meta, sendDocument() AU PLUS deux (téléversement puis envoi) ; aucun
// appel n'est répété automatiquement dans la même requête. Chaque résultat
// est classé selon ce que l'on SAIT du message (voir WhatsappMessageStatus
// dans schema.prisma). Ne lève jamais pour une erreur Meta ni pour une
// erreur de base APRÈS l'appel : le canal WhatsApp s'ajoute à l'email/push,
// son échec ne doit pas casser l'appelant. Seule une erreur de base AVANT
// l'appel (création de la ligne QUEUED) remonte — rien n'est alors parti.
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WhatsappAccessService,
    private readonly client: WhatsappCloudClient,
  ) {}

  async send(input: WhatsappSendInput): Promise<WhatsappSendResult> {
    const access = await this.access.canUseWhatsapp(input.userId);
    if (!access.allowed) return this.refused(input, access.reason);

    const message = await this.createQueued(input, access.recipientPhone, {
      messageType: input.kind === 'template' ? 'TEMPLATE' : 'TEXT',
      templateName: input.kind === 'template' ? input.template.name : null,
      payload: input.kind === 'template' ? templatePayload(input.template) : { body: input.text },
    });

    // Seul l'appel Meta est dans le try : une erreur de persistance APRÈS un
    // succès connu ne doit jamais être reclassée comme une erreur Meta.
    let wamid: string;
    try {
      wamid =
        input.kind === 'template'
          ? await this.client.sendTemplate({
              to: access.metaNumber,
              name: input.template.name,
              languageCode: TEMPLATE_LANGUAGE,
              components: templateComponents(input.template),
              callbackData: message.id,
            })
          : await this.client.sendText({ to: access.metaNumber, body: input.text, callbackData: message.id });
    } catch (error) {
      return this.markFailure(message.id, input.source, error, classify(error));
    }
    return this.markSent(message.id, input.source, wamid);
  }

  async sendDocument(input: WhatsappDocumentInput): Promise<WhatsappSendResult> {
    const access = await this.access.canUseWhatsapp(input.userId);
    if (!access.allowed) return this.refused(input, access.reason);

    const message = await this.createQueued(input, access.recipientPhone, {
      messageType: input.template ? 'TEMPLATE' : 'DOCUMENT',
      templateName: input.template?.name ?? null,
      payload: {
        ...(input.template ? templatePayload(input.template) : {}),
        filename: input.document.filename,
      },
    });

    let mediaId: string;
    try {
      mediaId = await this.client.uploadMedia({
        content: input.document.content,
        mimeType: input.document.mimeType,
        filename: input.document.filename,
      });
    } catch (error) {
      // Téléversement incertain : le fichier existe peut-être chez Meta,
      // mais le locataire n'a certainement RIEN reçu (aucun envoi n'a eu
      // lieu) — FAILED réessayable, jamais UNKNOWN, sinon la quittance ne
      // serait jamais renvoyée alors qu'on sait qu'elle n'est pas arrivée.
      // Le fichier orphelin est sans effet et expire seul chez Meta.
      const classification = classify(error);
      return classification.status === 'UNKNOWN'
        ? this.markFailure(message.id, input.source, error, {
            status: 'FAILED',
            retryable: true,
            alert: false,
            errorCode: MEDIA_UPLOAD_UNCERTAIN,
          })
        : this.markFailure(message.id, input.source, error, classification);
    }

    let wamid: string;
    try {
      wamid = input.template
        ? await this.client.sendTemplate({
            to: access.metaNumber,
            name: input.template.name,
            languageCode: TEMPLATE_LANGUAGE,
            components: [
              {
                type: 'header',
                parameters: [
                  { type: 'document', document: { id: mediaId, filename: input.document.filename } },
                ],
              },
              ...templateComponents(input.template),
            ],
            callbackData: message.id,
          })
        : await this.client.sendDocumentMessage({
            to: access.metaNumber,
            mediaId,
            filename: input.document.filename,
            callbackData: message.id,
          });
    } catch (error) {
      return this.markFailure(message.id, input.source, error, classify(error));
    }
    return this.markSent(message.id, input.source, wamid);
  }

  private refused(input: SendContext, reason: WhatsappAccessRefusal): WhatsappSendResult {
    // Aucune ligne WhatsappMessage pour un refus : ce n'est pas une tentative.
    this.logger.debug(`[whatsapp/${input.source}] envoi sauté pour user=${input.userId} : ${reason}`);
    return { outcome: 'REFUSED', reason };
  }

  private createQueued(
    input: SendContext,
    recipientPhone: string,
    content: {
      messageType: WhatsappMessageType;
      templateName: string | null;
      payload: Prisma.InputJsonObject;
    },
  ): Promise<{ id: string }> {
    return this.prisma.whatsappMessage.create({
      data: {
        userId: input.userId,
        recipientPhone,
        direction: 'OUTBOUND',
        source: input.source,
        status: 'QUEUED',
        scheduleEntryId: input.scheduleEntryId,
        paymentId: input.paymentId,
        ...content,
      },
      select: { id: true },
    });
  }

  // Meta a accepté : le message EST parti, quoi qu'il arrive ensuite en base.
  // Si l'écriture échoue (coupure Supabase), on renvoie quand même SENT —
  // jamais une erreur vers l'appelant, qui croirait à un échec d'envoi — et
  // on alerte avec le wamid (non personnel) pour le retrouver. La ligne reste
  // QUEUED : jamais renvoyée (règle WHATSAPP_QUEUED_STALE_AFTER_MS), et le
  // webhook de statut (unité 44) la rattachera via biz_opaque_callback_data.
  private async markSent(messageId: string, source: string, wamid: string): Promise<WhatsappSendResult> {
    try {
      await this.prisma.whatsappMessage.update({
        where: { id: messageId },
        data: { status: 'SENT', wamid, sentAt: new Date() },
      });
    } catch (error) {
      this.alertPersistenceFailure(messageId, source, `SENT wamid=${wamid}`, error);
    }
    return { outcome: 'SENT', messageId, wamid };
  }

  private alertPersistenceFailure(messageId: string, source: string, outcome: string, error: unknown): void {
    const summary = `[whatsapp/${source}] message=${messageId} : résultat ${outcome} non enregistré en base`;
    this.logger.error(summary, error instanceof Error ? error.stack : undefined);
    Sentry.captureMessage(`WhatsApp : ${summary}`, 'error');
  }

  private async markFailure(
    messageId: string,
    source: string,
    error: unknown,
    classification: MetaErrorClassification & { errorCode?: string },
  ): Promise<WhatsappSendResult> {
    const status: WhatsappMessageStatus = classification.status;
    try {
      await this.prisma.whatsappMessage.update({
        where: { id: messageId },
        data: {
          status,
          retryable: classification.retryable,
          errorCode: classification.errorCode ?? errorCodeOf(error),
          errorMessage: sanitizeErrorMessage(error),
          failedAt: status === 'FAILED' ? new Date() : null,
        },
      });
    } catch (persistenceError) {
      // Ligne restée QUEUED : traitée comme UNKNOWN, jamais renvoyée — sûr.
      this.alertPersistenceFailure(messageId, source, status, persistenceError);
    }

    const summary = `[whatsapp/${source}] message=${messageId} ${status} (code ${errorCodeOf(error)})`;
    if (classification.alert) {
      // Configuration de WARAH en cause (jeton, compte, code inconnu...) :
      // tous les envois échoueront tant qu'un humain n'intervient pas.
      this.logger.error(summary);
      Sentry.captureMessage(`WhatsApp : intervention requise — ${summary}`, 'error');
    } else {
      this.logger.warn(summary);
    }
    return { outcome: status, messageId, retryable: classification.retryable };
  }
}

// Seuls ces champs entrent dans `payload` — choisis un par un, jamais
// l'objet reçu tel quel : un champ en trop (secret, jeton, code locataire)
// passé par erreur par un appelant n'est donc jamais persisté.
function templatePayload(template: Pick<TemplateParams, 'bodyParams' | 'buttonParam'>): Prisma.InputJsonObject {
  return template.buttonParam === undefined
    ? { bodyParams: template.bodyParams }
    : { bodyParams: template.bodyParams, buttonParam: template.buttonParam };
}

function templateComponents(template: Pick<TemplateParams, 'bodyParams' | 'buttonParam'>): TemplateComponent[] {
  const components: TemplateComponent[] = [
    { type: 'body', parameters: template.bodyParams.map((text) => ({ type: 'text', text })) },
  ];
  if (template.buttonParam !== undefined) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: template.buttonParam }],
    });
  }
  return components;
}

// Une erreur qui n'est pas une MetaApiError (bug inattendu) est traitée comme
// une réponse absente : on ne sait pas si Meta a reçu le message.
function classify(error: unknown): MetaErrorClassification {
  return error instanceof MetaApiError
    ? classifyMetaError(error)
    : classifyMetaError({ httpStatus: null, errorCode: null, errorSubcode: null });
}

function errorCodeOf(error: unknown): string {
  if (!(error instanceof MetaApiError)) return 'UNEXPECTED';
  if (error.httpStatus === null) return 'NO_RESPONSE';
  if (error.errorCode === null) return `HTTP_${error.httpStatus}`;
  return error.errorSubcode === null ? `${error.errorCode}` : `${error.errorCode}:${error.errorSubcode}`;
}

// Message court et sans donnée personnelle : Meta peut citer le numéro du
// destinataire dans ses messages d'erreur.
function sanitizeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'Erreur inattendue';
  return raw.replace(/\+?\d{8,}/g, '[numéro]').slice(0, ERROR_MESSAGE_MAX_LENGTH);
}

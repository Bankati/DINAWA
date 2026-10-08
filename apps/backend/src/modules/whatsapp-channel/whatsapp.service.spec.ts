import { MetaApiError } from './meta-error';
import { WhatsappService } from './whatsapp.service';

jest.mock('@sentry/nestjs', () => ({ captureMessage: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Sentry = require('@sentry/nestjs') as { captureMessage: jest.Mock };

describe('WhatsappService', () => {
  let prisma: { whatsappMessage: { create: jest.Mock; update: jest.Mock } };
  let access: { canUseWhatsapp: jest.Mock };
  let client: {
    sendTemplate: jest.Mock;
    sendText: jest.Mock;
    uploadMedia: jest.Mock;
    sendDocumentMessage: jest.Mock;
  };
  let service: WhatsappService;

  const reminder = {
    userId: 'tenant-1',
    source: 'payment-reminder',
    scheduleEntryId: 'entry-1',
    kind: 'template' as const,
    template: { name: 'rappel_loyer' as const, bodyParams: ['Ama', 'octobre 2026'], buttonParam: 'jeton' },
  };
  const receipt = {
    userId: 'tenant-1',
    source: 'receipt',
    paymentId: 'pay-1',
    document: { content: Buffer.from('%PDF'), filename: 'quittance.pdf', mimeType: 'application/pdf' as const },
    template: { name: 'paiement_recu' as const, bodyParams: ['Ama', '75 000'] },
  };
  type DataArg = [{ data: Record<string, unknown> }];
  const createdData = (): Record<string, unknown> =>
    (prisma.whatsappMessage.create.mock.calls as DataArg[])[0][0].data;
  const lastUpdate = (): { data: Record<string, unknown> } => {
    const calls = prisma.whatsappMessage.update.mock.calls as DataArg[];
    return calls[calls.length - 1][0];
  };
  const templateArgs = (): { components: Record<string, unknown>[] } =>
    (client.sendTemplate.mock.calls as [{ components: Record<string, unknown>[] }][])[0][0];

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      whatsappMessage: {
        create: jest.fn().mockResolvedValue({ id: 'msg-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    access = {
      canUseWhatsapp: jest.fn().mockResolvedValue({
        allowed: true,
        recipientPhone: '90112233',
        metaNumber: '22890112233',
      }),
    };
    client = {
      sendTemplate: jest.fn().mockResolvedValue('wamid.1'),
      sendText: jest.fn().mockResolvedValue('wamid.2'),
      uploadMedia: jest.fn().mockResolvedValue('media-1'),
      sendDocumentMessage: jest.fn().mockResolvedValue('wamid.3'),
    };
    service = new WhatsappService(prisma as never, access as never, client as never);
  });

  describe('send', () => {
    it('ne crée aucune ligne et n’appelle pas Meta quand l’accès est refusé', async () => {
      access.canUseWhatsapp.mockResolvedValueOnce({ allowed: false, reason: 'NO_CONSENT' });

      await expect(service.send(reminder)).resolves.toEqual({ outcome: 'REFUSED', reason: 'NO_CONSENT' });
      expect(prisma.whatsappMessage.create).not.toHaveBeenCalled();
      expect(client.sendTemplate).not.toHaveBeenCalled();
    });

    it('trace l’intention en QUEUED avant l’appel, puis SENT avec le wamid', async () => {
      await expect(service.send(reminder)).resolves.toEqual({
        outcome: 'SENT',
        messageId: 'msg-1',
        wamid: 'wamid.1',
      });
      expect(createdData()).toMatchObject({
        status: 'QUEUED',
        recipientPhone: '90112233',
        messageType: 'TEMPLATE',
        templateName: 'rappel_loyer',
        scheduleEntryId: 'entry-1',
      });
      expect(prisma.whatsappMessage.create.mock.invocationCallOrder[0]).toBeLessThan(
        client.sendTemplate.mock.invocationCallOrder[0],
      );
      expect(lastUpdate().data).toMatchObject({ status: 'SENT', wamid: 'wamid.1' });
    });

    it('passe l’id de la ligne en callbackData et le numéro au format Meta', async () => {
      await service.send(reminder);
      expect(client.sendTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ to: '22890112233', callbackData: 'msg-1', languageCode: 'fr' }),
      );
    });

    it('ne persiste jamais dans payload un champ hors liste (secret, code locataire...)', async () => {
      const withLeak = {
        ...reminder,
        template: { ...reminder.template, pin: '482915', token: 'secret' },
      };
      await service.send(withLeak);

      expect(Object.keys(createdData()['payload'] as object).sort()).toEqual([
        'bodyParams',
        'buttonParam',
      ]);
    });

    it('classe FAILED définitif un refus déterministe (destinataire sans WhatsApp)', async () => {
      client.sendTemplate.mockRejectedValueOnce(new MetaApiError('Unable to deliver', 400, 131026));

      await expect(service.send(reminder)).resolves.toEqual({
        outcome: 'FAILED',
        messageId: 'msg-1',
        retryable: false,
      });
      expect(lastUpdate().data).toMatchObject({ status: 'FAILED', retryable: false, errorCode: '131026' });
    });

    it('classe FAILED réessayable une limite de débit', async () => {
      client.sendTemplate.mockRejectedValueOnce(new MetaApiError('Throughput', 400, 130429));
      await expect(service.send(reminder)).resolves.toMatchObject({ outcome: 'FAILED', retryable: true });
    });

    it.each([
      ['un timeout (aucune réponse)', new MetaApiError('timeout', null)],
      ['un 2xx sans wamid', new MetaApiError('sans wamid', 200)],
      ['une erreur générique de Meta', new MetaApiError('unknown', 500, 131000)],
      ['une erreur inattendue', new Error('bug')],
    ])('classe UNKNOWN non réessayable %s', async (_label, error) => {
      client.sendTemplate.mockRejectedValueOnce(error);

      await expect(service.send(reminder)).resolves.toMatchObject({ outcome: 'UNKNOWN', retryable: false });
      expect(lastUpdate().data).toMatchObject({ status: 'UNKNOWN', retryable: false, failedAt: null });
    });

    it('déclenche une alerte Sentry quand la configuration de WARAH est en cause (jeton expiré)', async () => {
      client.sendTemplate.mockRejectedValueOnce(new MetaApiError('Token expired', 401, 190));
      await service.send(reminder);
      expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    });

    it('masque un numéro cité dans le message d’erreur de Meta', async () => {
      client.sendTemplate.mockRejectedValueOnce(
        new MetaApiError('Recipient 22890112233 not allowed', 400, 131026),
      );
      await service.send(reminder);
      expect(lastUpdate().data['errorMessage']).toBe('Recipient [numéro] not allowed');
    });

    it('envoie un texte libre sans modèle', async () => {
      await expect(
        service.send({ userId: 'tenant-1', source: 'bot', kind: 'text', text: 'Bonjour' }),
      ).resolves.toMatchObject({ outcome: 'SENT', wamid: 'wamid.2' });
      expect(createdData()).toMatchObject({
        messageType: 'TEXT',
        templateName: null,
      });
    });
  });

  describe('erreur de base après l’appel Meta (/review unité 42)', () => {
    it('renvoie SENT avec le wamid et alerte quand l’écriture échoue après un succès Meta', async () => {
      prisma.whatsappMessage.update.mockRejectedValueOnce(new Error('Supabase injoignable'));

      await expect(service.send(reminder)).resolves.toEqual({
        outcome: 'SENT',
        messageId: 'msg-1',
        wamid: 'wamid.1',
      });
      expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    });

    it('ne reclasse jamais une erreur de persistance en erreur Meta (aucune écriture UNKNOWN)', async () => {
      prisma.whatsappMessage.update.mockRejectedValueOnce(new Error('Supabase injoignable'));
      await service.send(reminder);

      // Une seule tentative d'écriture (SENT), jamais suivie d'un UNKNOWN.
      expect(prisma.whatsappMessage.update).toHaveBeenCalledTimes(1);
      expect(lastUpdate().data).toMatchObject({ status: 'SENT' });
    });

    it('ne lève pas quand l’écriture d’un échec Meta échoue elle aussi', async () => {
      client.sendTemplate.mockRejectedValueOnce(new MetaApiError('Unable to deliver', 400, 131026));
      prisma.whatsappMessage.update.mockRejectedValueOnce(new Error('Supabase injoignable'));

      await expect(service.send(reminder)).resolves.toMatchObject({ outcome: 'FAILED', retryable: false });
    });

    it('applique la même règle à sendDocument', async () => {
      prisma.whatsappMessage.update.mockRejectedValueOnce(new Error('Supabase injoignable'));
      await expect(service.sendDocument(receipt)).resolves.toMatchObject({ outcome: 'SENT' });
      expect(prisma.whatsappMessage.update).toHaveBeenCalledTimes(1);
    });

    it('laisse remonter une erreur de base AVANT l’appel Meta : rien n’est parti', async () => {
      prisma.whatsappMessage.create.mockRejectedValueOnce(new Error('Supabase injoignable'));
      await expect(service.send(reminder)).rejects.toThrow('Supabase injoignable');
      expect(client.sendTemplate).not.toHaveBeenCalled();
    });
  });

  describe('sendDocument', () => {
    it('téléverse puis envoie le modèle avec le document en en-tête', async () => {
      await expect(service.sendDocument(receipt)).resolves.toMatchObject({ outcome: 'SENT' });

      expect(templateArgs().components[0]).toEqual({
        type: 'header',
        parameters: [{ type: 'document', document: { id: 'media-1', filename: 'quittance.pdf' } }],
      });
    });

    it('n’appelle jamais Meta plus de deux fois', async () => {
      await service.sendDocument(receipt);
      const calls =
        client.uploadMedia.mock.calls.length +
        client.sendTemplate.mock.calls.length +
        client.sendDocumentMessage.mock.calls.length;
      expect(calls).toBe(2);
    });

    it('classe FAILED réessayable (MEDIA_UPLOAD_UNCERTAIN) un téléversement sans réponse : le locataire n’a rien reçu', async () => {
      client.uploadMedia.mockRejectedValueOnce(new MetaApiError('timeout', null));

      await expect(service.sendDocument(receipt)).resolves.toEqual({
        outcome: 'FAILED',
        messageId: 'msg-1',
        retryable: true,
      });
      expect(lastUpdate().data).toMatchObject({ errorCode: 'MEDIA_UPLOAD_UNCERTAIN' });
      expect(client.sendTemplate).not.toHaveBeenCalled();
    });

    it('classe selon la grille un téléversement explicitement refusé', async () => {
      client.uploadMedia.mockRejectedValueOnce(new MetaApiError('Unsupported', 400, 131053));
      await expect(service.sendDocument(receipt)).resolves.toMatchObject({
        outcome: 'FAILED',
        retryable: false,
      });
    });

    it('classe UNKNOWN un envoi sans réponse après un téléversement réussi', async () => {
      client.sendTemplate.mockRejectedValueOnce(new MetaApiError('timeout', null));
      await expect(service.sendDocument(receipt)).resolves.toMatchObject({ outcome: 'UNKNOWN' });
    });

    it('envoie un simple message document quand aucun modèle n’est fourni', async () => {
      const withoutTemplate = {
        userId: receipt.userId,
        source: receipt.source,
        document: receipt.document,
      };
      await expect(service.sendDocument(withoutTemplate)).resolves.toMatchObject({ wamid: 'wamid.3' });
      expect(client.sendTemplate).not.toHaveBeenCalled();
    });
  });
});

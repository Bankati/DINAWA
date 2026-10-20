import { parseMetaNotification } from './meta-webhook-payload';
import {
  PHONE_NUMBER_ID,
  REAL_FAILED_STATUS,
  SENDER,
  messageNotification,
  statusNotification,
  textNotification,
} from './__fixtures__/meta-notifications';

describe('parseMetaNotification', () => {
  it('lit la vraie notification d’échec reçue le 11 octobre (131031)', () => {
    const [parsed] = parseMetaNotification(REAL_FAILED_STATUS);
    expect(parsed).toEqual({
      phoneNumberId: PHONE_NUMBER_ID,
      messages: [],
      statuses: [
        {
          wamid: 'wamid.FAILED-131031',
          status: 'failed',
          at: new Date(1791760832 * 1000),
          callbackData: null,
          errorCode: 131031,
        },
      ],
      skipped: 0,
    });
  });

  it('garde biz_opaque_callback_data (id de la ligne WhatsappMessage)', () => {
    const [parsed] = parseMetaNotification(statusNotification('delivered', { callbackData: 'msg-1' }));
    expect(parsed?.statuses[0]).toMatchObject({ status: 'delivered', callbackData: 'msg-1', errorCode: null });
  });

  it('lit un message texte', () => {
    const [parsed] = parseMetaNotification(textNotification('Bonjour, ma fenêtre est cassée'));
    expect(parsed?.messages).toEqual([
      {
        wamid: 'wamid.IN-1',
        from: SENDER,
        receivedAt: new Date(1791800100 * 1000),
        type: 'TEXT',
        text: 'Bonjour, ma fenêtre est cassée',
        payload: {},
      },
    ]);
  });

  it('coupe un texte au-delà de 4 096 caractères', () => {
    const [parsed] = parseMetaNotification(textNotification('a'.repeat(5000)));
    expect(parsed?.messages[0]?.text).toHaveLength(4096);
  });

  it('lit un choix dans le menu (liste)', () => {
    const [parsed] = parseMetaNotification(
      messageNotification({
        type: 'interactive',
        interactive: { type: 'list_reply', list_reply: { id: 'pay', title: 'Payer mon loyer', description: '...' } },
      }),
    );
    expect(parsed?.messages[0]).toMatchObject({ type: 'INTERACTIVE', text: null, payload: { replyId: 'pay', title: 'Payer mon loyer' } });
  });

  it('lit un clic sur un bouton de réponse', () => {
    const [parsed] = parseMetaNotification(
      messageNotification({ type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'yes', title: 'Oui' } } }),
    );
    expect(parsed?.messages[0]?.payload).toEqual({ replyId: 'yes', title: 'Oui' });
  });

  it('lit un bouton de réponse rapide d’un modèle', () => {
    const [parsed] = parseMetaNotification(
      messageNotification({ type: 'button', button: { payload: 'PAY_NOW', text: 'Payer mon loyer' } }),
    );
    expect(parsed?.messages[0]).toMatchObject({ type: 'INTERACTIVE', payload: { replyId: 'PAY_NOW', title: 'Payer mon loyer' } });
  });

  it('lit une photo : référence Meta, type de fichier et légende, sans le nom de fichier', () => {
    const [parsed] = parseMetaNotification(
      messageNotification({
        type: 'image',
        image: { id: 'media-1', mime_type: 'image/jpeg', sha256: 'abc', caption: 'la fenêtre' },
      }),
    );
    expect(parsed?.messages[0]).toMatchObject({
      type: 'IMAGE',
      text: 'la fenêtre',
      payload: { mediaId: 'media-1', mimeType: 'image/jpeg' },
    });
  });

  it('ne garde pas le nom d’un document (souvent personnel)', () => {
    const [parsed] = parseMetaNotification(
      messageNotification({ type: 'document', document: { id: 'media-2', mime_type: 'application/pdf', filename: 'CNI_Ama.pdf' } }),
    );
    expect(parsed?.messages[0]).toMatchObject({ type: 'DOCUMENT', payload: { mediaId: 'media-2', mimeType: 'application/pdf' } });
    expect(JSON.stringify(parsed)).not.toContain('CNI_Ama');
  });

  it.each([
    ['location', { location: { latitude: 6.13, longitude: 1.22, name: 'Chez Ama' } }],
    ['contacts', { contacts: [{ name: { formatted_name: 'Kofi' } }] }],
    ['reaction', { reaction: { message_id: 'wamid.X', emoji: '👍' } }],
    ['sticker', { sticker: { id: 'media-3', mime_type: 'image/webp' } }],
    ['unsupported', { errors: [{ code: 131051 }] }],
  ])('ne garde que le type pour « %s »', (metaType, content) => {
    const [parsed] = parseMetaNotification(messageNotification({ type: metaType, ...content }));
    expect(parsed?.messages[0]).toMatchObject({ type: 'OTHER', text: null, payload: { metaType } });
    expect(JSON.stringify(parsed)).not.toMatch(/Chez Ama|Kofi|👍/);
  });

  it('ignore un élément illisible sans rejeter le reste de la notification', () => {
    const body = statusNotification('delivered');
    const value = ((body['entry'] as Record<string, unknown>[])[0]?.['changes'] as Record<string, unknown>[])[0]?.[
      'value'
    ] as Record<string, unknown>;
    (value['statuses'] as unknown[]).push({ id: 'wamid.X', status: 'deleted', timestamp: '1' }, 'n’importe quoi');
    const [parsed] = parseMetaNotification(body);
    expect(parsed?.statuses).toHaveLength(1);
    expect(parsed?.skipped).toBe(2);
  });

  it.each([
    ['un objet d’un autre produit', { object: 'page', entry: [] }],
    ['un corps vide', {}],
    ['une chaîne', 'bonjour'],
    ['null', null],
  ])('renvoie une liste vide pour %s', (_label, body) => {
    expect(parseMetaNotification(body)).toEqual([]);
  });
});

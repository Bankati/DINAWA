import axios, { AxiosError, AxiosHeaders } from 'axios';
import { MetaApiError } from './meta-error';
import { WhatsappCloudClient } from './whatsapp-cloud.client';

describe('WhatsappCloudClient', () => {
  let post: jest.Mock;
  let createMock: jest.SpyInstance;
  let client: WhatsappCloudClient;

  const config = {
    get: (key: string): string =>
      ({
        WHATSAPP_GRAPH_VERSION: 'v23.0',
        WHATSAPP_PHONE_NUMBER_ID: '1234',
        WHATSAPP_ACCESS_TOKEN: 'jeton',
      })[key] ?? '',
  };
  const axiosError = (status?: number, data?: unknown): AxiosError =>
    new AxiosError(
      'échec',
      status ? 'ERR_BAD_RESPONSE' : 'ECONNABORTED',
      undefined,
      undefined,
      status
        ? { status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data }
        : undefined,
    );

  beforeEach(() => {
    post = jest.fn();
    createMock = jest.spyOn(axios, 'create').mockReturnValue({ post } as never);
    client = new WhatsappCloudClient(config as never);
  });

  it('cible la version figée et le numéro configurés, avec le jeton en en-tête', () => {
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://graph.facebook.com/v23.0/1234',
        headers: { Authorization: 'Bearer jeton' },
      }),
    );
  });

  it('renvoie le wamid d’un modèle accepté et transmet le callbackData', async () => {
    post.mockResolvedValueOnce({ data: { messages: [{ id: 'wamid.1' }] } });

    await expect(
      client.sendTemplate({ to: '22890112233', name: 'rappel_loyer', languageCode: 'fr', components: [], callbackData: 'msg-1' }),
    ).resolves.toBe('wamid.1');
    expect(post).toHaveBeenCalledWith(
      '/messages',
      expect.objectContaining({
        messaging_product: 'whatsapp',
        to: '22890112233',
        type: 'template',
        biz_opaque_callback_data: 'msg-1',
      }),
    );
  });

  it('lève une MetaApiError sans code pour un 2xx sans wamid', async () => {
    post.mockResolvedValueOnce({ data: { messages: [] } });
    await expect(client.sendText({ to: '2289', body: 'x', callbackData: 'm' })).rejects.toMatchObject({
      httpStatus: 200,
      errorCode: null,
    });
  });

  it('normalise une erreur Graph (code et sous-code)', async () => {
    post.mockRejectedValueOnce(
      axiosError(400, { error: { message: 'Throughput', code: 130429, error_subcode: 2494055 } }),
    );
    await expect(client.sendText({ to: '2289', body: 'x', callbackData: 'm' })).rejects.toEqual(
      new MetaApiError('Throughput', 400, 130429, 2494055),
    );
  });

  it('normalise une absence de réponse en httpStatus null', async () => {
    post.mockRejectedValueOnce(axiosError());
    await expect(client.sendText({ to: '2289', body: 'x', callbackData: 'm' })).rejects.toMatchObject({
      httpStatus: null,
    });
  });

  it('n’appelle Meta qu’une seule fois, même en cas d’échec', async () => {
    post.mockRejectedValueOnce(axiosError());
    await expect(client.sendText({ to: '2289', body: 'x', callbackData: 'm' })).rejects.toBeInstanceOf(MetaApiError);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('téléverse un média en formulaire et renvoie son identifiant', async () => {
    post.mockResolvedValueOnce({ data: { id: 'media-1' } });

    await expect(
      client.uploadMedia({ content: Buffer.from('%PDF'), mimeType: 'application/pdf', filename: 'q.pdf' }),
    ).resolves.toBe('media-1');
    const [path, form] = post.mock.calls[0] as [string, FormData];
    expect(path).toBe('/media');
    expect(form.get('messaging_product')).toBe('whatsapp');
  });
});

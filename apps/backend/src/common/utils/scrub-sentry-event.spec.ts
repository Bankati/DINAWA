import { scrubSentryEvent } from './scrub-sentry-event';

const TOKEN = 'eyJwIjoicGF5LWxpbmsifQ.c2lnbmF0dXJl';

describe('scrubSentryEvent', () => {
  it('ne laisse le jeton nulle part dans l’événement envoyé à Sentry', () => {
    const event = scrubSentryEvent({
      request: { url: `https://api.warah/api/pay-links/${TOKEN}/initiate`, query_string: `token=${TOKEN}` },
      transaction: `POST /api/pay-links/${TOKEN}/initiate`,
      breadcrumbs: [
        { message: `GET /api/pay-links/${TOKEN}`, data: { url: `/api/pay-links/${TOKEN}`, status_code: 200 } },
        { data: { from: `/payer/${TOKEN}`, to: `/payer/${TOKEN}/merci` } },
      ],
    });

    expect(JSON.stringify(event)).not.toContain(TOKEN);
    expect(event.request?.url).toContain('/api/pay-links/[jeton:');
    expect(event.breadcrumbs?.[0]?.data?.['status_code']).toBe(200);
  });

  it('retire une chaîne de requête sous forme d’objet plutôt que de risquer un oubli', () => {
    const event = scrubSentryEvent({ request: { query_string: [['token', TOKEN]] } });
    expect(event.request?.query_string).toBe('[masqué]');
  });

  it('accepte un événement sans requête ni fil d’Ariane', () => {
    expect(scrubSentryEvent({ transaction: 'GET /api/health' })).toEqual({ transaction: 'GET /api/health' });
  });
});

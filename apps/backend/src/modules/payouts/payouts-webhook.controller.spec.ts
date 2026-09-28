import { PayoutsWebhookController } from './payouts-webhook.controller';

describe('PayoutsWebhookController', () => {
  it('délègue au service avec le payoutId de la callback_url (jamais le corps de la requête)', async () => {
    const payouts = { handleCallback: jest.fn().mockResolvedValue({ status: 'ok' }) };
    const controller = new PayoutsWebhookController(payouts as never);

    await expect(controller.handle('payout-1')).resolves.toEqual({ status: 'ok' });

    expect(payouts.handleCallback).toHaveBeenCalledWith('payout-1');
  });
});

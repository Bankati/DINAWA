import { PaydunyaWebhookController } from './paydunya-webhook.controller';

describe('PaydunyaWebhookController', () => {
  it('délègue à PaymentsService.handlePaydunyaCallback avec le paymentId de la query', async () => {
    const paymentsService = {
      handlePaydunyaCallback: jest.fn().mockResolvedValue({ status: 'ok' }),
    };
    const subscriptionsService = { reconcilePaydunyaSubscriptionInvoice: jest.fn() };
    const controller = new PaydunyaWebhookController(
      paymentsService as never,
      subscriptionsService as never,
    );

    const result = await controller.handle('payment-1');

    expect(paymentsService.handlePaydunyaCallback).toHaveBeenCalledWith('payment-1');
    expect(subscriptionsService.reconcilePaydunyaSubscriptionInvoice).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'ok' });
  });

  it('transmet undefined si aucun paymentId dans la query', async () => {
    const paymentsService = {
      handlePaydunyaCallback: jest.fn().mockResolvedValue({ status: 'ignored' }),
    };
    const subscriptionsService = { reconcilePaydunyaSubscriptionInvoice: jest.fn() };
    const controller = new PaydunyaWebhookController(
      paymentsService as never,
      subscriptionsService as never,
    );

    await controller.handle();

    expect(paymentsService.handlePaydunyaCallback).toHaveBeenCalledWith(undefined);
  });

  it('route vers SubscriptionsService quand subscriptionInvoiceId est présent, jamais vers PaymentsService (voir /architect abonnements)', async () => {
    const paymentsService = { handlePaydunyaCallback: jest.fn() };
    const subscriptionsService = {
      reconcilePaydunyaSubscriptionInvoice: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new PaydunyaWebhookController(
      paymentsService as never,
      subscriptionsService as never,
    );

    const result = await controller.handle(undefined, 'invoice-1');

    expect(subscriptionsService.reconcilePaydunyaSubscriptionInvoice).toHaveBeenCalledWith(
      'invoice-1',
    );
    expect(paymentsService.handlePaydunyaCallback).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'ok' });
  });

  it('répond toujours 200 même si la réconciliation d’abonnement échoue de façon inattendue', async () => {
    const paymentsService = { handlePaydunyaCallback: jest.fn() };
    const subscriptionsService = {
      reconcilePaydunyaSubscriptionInvoice: jest.fn().mockRejectedValue(new Error('boom')),
    };
    const controller = new PaydunyaWebhookController(
      paymentsService as never,
      subscriptionsService as never,
    );

    const result = await controller.handle(undefined, 'invoice-1');

    expect(result).toEqual({ status: 'ok' });
  });
});

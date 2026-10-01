import { PaydunyaWebhookController } from './paydunya-webhook.controller';

describe('PaydunyaWebhookController', () => {
  it('délègue à PaymentsService.handlePaydunyaCallback avec le paymentId de la query', async () => {
    const paymentsService = {
      handlePaydunyaCallback: jest.fn().mockResolvedValue({ status: 'ok' }),
    };
    const subscriptionsService = { handleSubscriptionInvoiceCallback: jest.fn() };
    const controller = new PaydunyaWebhookController(
      paymentsService as never,
      subscriptionsService as never,
    );

    const result = await controller.handle('payment-1');

    expect(paymentsService.handlePaydunyaCallback).toHaveBeenCalledWith('payment-1');
    expect(subscriptionsService.handleSubscriptionInvoiceCallback).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'ok' });
  });

  it('transmet undefined si aucun paymentId dans la query', async () => {
    const paymentsService = {
      handlePaydunyaCallback: jest.fn().mockResolvedValue({ status: 'ignored' }),
    };
    const subscriptionsService = { handleSubscriptionInvoiceCallback: jest.fn() };
    const controller = new PaydunyaWebhookController(
      paymentsService as never,
      subscriptionsService as never,
    );

    await controller.handle();

    expect(paymentsService.handlePaydunyaCallback).toHaveBeenCalledWith(undefined);
  });

  it('route vers SubscriptionsService.handleSubscriptionInvoiceCallback quand subscriptionInvoiceId est présent, jamais vers PaymentsService (voir /architect abonnements)', async () => {
    const paymentsService = { handlePaydunyaCallback: jest.fn() };
    const subscriptionsService = {
      handleSubscriptionInvoiceCallback: jest.fn().mockResolvedValue({ status: 'ok' }),
    };
    const controller = new PaydunyaWebhookController(
      paymentsService as never,
      subscriptionsService as never,
    );

    const result = await controller.handle(undefined, 'invoice-1');

    expect(subscriptionsService.handleSubscriptionInvoiceCallback).toHaveBeenCalledWith(
      'invoice-1',
    );
    expect(paymentsService.handlePaydunyaCallback).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'ok' });
  });
});

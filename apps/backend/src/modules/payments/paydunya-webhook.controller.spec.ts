import { PaydunyaWebhookController } from './paydunya-webhook.controller';

describe('PaydunyaWebhookController', () => {
  it('délègue à PaymentsService.handlePaydunyaCallback avec le paymentId de la query', async () => {
    const paymentsService = {
      handlePaydunyaCallback: jest.fn().mockResolvedValue({ status: 'ok' }),
    };
    const controller = new PaydunyaWebhookController(paymentsService as never);

    const result = await controller.handle('payment-1');

    expect(paymentsService.handlePaydunyaCallback).toHaveBeenCalledWith('payment-1');
    expect(result).toEqual({ status: 'ok' });
  });

  it('transmet undefined si aucun paymentId dans la query', async () => {
    const paymentsService = {
      handlePaydunyaCallback: jest.fn().mockResolvedValue({ status: 'ignored' }),
    };
    const controller = new PaydunyaWebhookController(paymentsService as never);

    await controller.handle();

    expect(paymentsService.handlePaydunyaCallback).toHaveBeenCalledWith(undefined);
  });
});

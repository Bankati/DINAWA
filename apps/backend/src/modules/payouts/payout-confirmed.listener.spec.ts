import { PayoutConfirmedListener } from './payout-confirmed.listener';

describe('PayoutConfirmedListener', () => {
  let listener: PayoutConfirmedListener;
  let payouts: { createForPayment: jest.Mock; process: jest.Mock };

  beforeEach(() => {
    payouts = {
      createForPayment: jest.fn().mockResolvedValue({ id: 'payout-1' }),
      process: jest.fn().mockResolvedValue(undefined),
    };
    listener = new PayoutConfirmedListener(payouts as never);
  });

  it('crée puis envoie le reversement du paiement confirmé', async () => {
    await listener.handle({ paymentId: 'payment-1' });

    expect(payouts.createForPayment).toHaveBeenCalledWith('payment-1');
    expect(payouts.process).toHaveBeenCalledWith('payout-1');
  });

  it('n’envoie rien quand le paiement n’est pas éligible (manuel, déclaré, ancien)', async () => {
    payouts.createForPayment.mockResolvedValue(null);

    await listener.handle({ paymentId: 'payment-1' });

    expect(payouts.process).not.toHaveBeenCalled();
  });

  it('ne lève jamais : l’événement est rattrapé par le cron', async () => {
    payouts.createForPayment.mockRejectedValue(new Error('db down'));

    await expect(listener.handle({ paymentId: 'payment-1' })).resolves.toBeUndefined();
  });
});

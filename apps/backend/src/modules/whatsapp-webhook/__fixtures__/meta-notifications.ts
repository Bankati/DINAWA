// Notifications Meta pour les tests du webhook (unité 44). La première est
// la vraie notification reçue le 2026-10-11 lors du premier essai réel
// (échec 131031), numéros et identifiants Meta remplacés par des faux.
export const PHONE_NUMBER_ID = '100000000000001';
export const SENDER = '22890000001'; // format Meta, numéro fictif
export const SENDER_LOCAL = '90000001';

function notification(value: Record<string, unknown>): Record<string, unknown> {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '200000000000002',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '15550000000', phone_number_id: PHONE_NUMBER_ID },
              ...value,
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

export const REAL_FAILED_STATUS = notification({
  contacts: [{ wa_id: SENDER, user_id: 'TG.0000000000000001' }],
  statuses: [
    {
      id: 'wamid.FAILED-131031',
      status: 'failed',
      timestamp: '1791760832',
      recipient_id: SENDER,
      recipient_logical_id: '300000000000003',
      recipient_user_id: 'TG.0000000000000001',
      errors: [
        {
          code: 131031,
          title: 'Business Account locked',
          message: 'Business Account locked',
          error_data: { details: 'Business account has been locked.' },
          href: 'https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/',
        },
      ],
      internal_1p_only_data: { webhook_extra_data: 'xxx', account_context: { cs_id: PHONE_NUMBER_ID } },
    },
  ],
});

export function statusNotification(
  status: 'sent' | 'delivered' | 'read' | 'failed',
  options: { wamid?: string; callbackData?: string; timestamp?: string; errorCode?: number } = {},
): Record<string, unknown> {
  return notification({
    statuses: [
      {
        id: options.wamid ?? 'wamid.OUT-1',
        status,
        timestamp: options.timestamp ?? '1791800000',
        recipient_id: SENDER,
        ...(options.callbackData ? { biz_opaque_callback_data: options.callbackData } : {}),
        ...(options.errorCode ? { errors: [{ code: options.errorCode, title: 'erreur' }] } : {}),
      },
    ],
  });
}

export function textNotification(text: string, options: { wamid?: string; from?: string } = {}): Record<string, unknown> {
  return notification({
    contacts: [{ profile: { name: 'Ama' }, wa_id: options.from ?? SENDER }],
    messages: [
      {
        from: options.from ?? SENDER,
        id: options.wamid ?? 'wamid.IN-1',
        timestamp: '1791800100',
        type: 'text',
        text: { body: text },
      },
    ],
  });
}

export function messageNotification(message: Record<string, unknown>): Record<string, unknown> {
  return notification({
    messages: [{ from: SENDER, id: 'wamid.IN-2', timestamp: '1791800200', ...message }],
  });
}

export function otherNumberNotification(): Record<string, unknown> {
  const body = textNotification('bjr');
  const entry = (body['entry'] as Record<string, unknown>[])[0];
  const change = (entry['changes'] as Record<string, unknown>[])[0];
  const value = change['value'] as Record<string, unknown>;
  value['metadata'] = { display_phone_number: '15559999999', phone_number_id: '999999999999999' };
  return body;
}

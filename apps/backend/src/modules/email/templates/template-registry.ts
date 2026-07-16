import * as signupConfirmation from './signup-confirmation.template';
import * as passwordResetOtp from './password-reset-otp.template';
import * as tenantInvitation from './tenant-invitation.template';
import * as receipt from './receipt.template';
import * as paymentReminder from './payment-reminder.template';
import * as overdueAlert from './overdue-alert.template';
import * as paymentDeclarationPending from './payment-declaration-pending.template';
import * as monthlyReport from './monthly-report.template';
import * as listingContact from './listing-contact.template';
import * as inactivityWarning from './inactivity-warning.template';
import * as accountSuspended from './account-suspended.template';
import * as accountReactivated from './account-reactivated.template';
import * as leaseCreated from './lease-created.template';
import { TemplateModule, TemplateVariables } from './types';

export type EmailTemplate =
  | 'signup-confirmation'
  | 'password-reset-otp'
  | 'tenant-invitation'
  | 'receipt'
  | 'payment-reminder'
  | 'overdue-alert'
  | 'payment-declaration-pending'
  | 'monthly-report'
  | 'listing-contact'
  | 'inactivity-warning'
  | 'account-suspended'
  | 'account-reactivated'
  | 'lease-created';

const registry: Record<EmailTemplate, TemplateModule> = {
  'signup-confirmation': signupConfirmation,
  'password-reset-otp': passwordResetOtp,
  'tenant-invitation': tenantInvitation,
  receipt,
  'payment-reminder': paymentReminder,
  'overdue-alert': overdueAlert,
  'payment-declaration-pending': paymentDeclarationPending,
  'monthly-report': monthlyReport,
  'listing-contact': listingContact,
  'inactivity-warning': inactivityWarning,
  'account-suspended': accountSuspended,
  'account-reactivated': accountReactivated,
  'lease-created': leaseCreated,
};

export function subjectFor(template: EmailTemplate, variables: TemplateVariables): string {
  return registry[template].subject(variables);
}

export function renderTemplate(template: EmailTemplate, variables: TemplateVariables): string {
  return registry[template].render(variables);
}

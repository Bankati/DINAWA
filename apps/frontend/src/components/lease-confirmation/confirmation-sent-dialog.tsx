'use client';

import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ds';
import { formatFcfa } from '@/lib/format';
import {
  LEASE_CONFIRMATIONS_QUERY_KEY,
  firstNameOf,
  formatDayMonth,
  formatFullDate,
  leaseConfirmationsApi,
  propertyTitle,
  que,
  type ConfirmationProperty,
} from '@/lib/lease-confirmations';
import { TOUCH_BUTTON } from './touch';

// Écran A2 : remplace la fenêtre « Locataire invité » (lien à copier) quand
// la personne invitée a déjà un compte WARAH. Pas de lien : WARAH s'en charge.

/** Ce que le formulaire d'invitation connaît déjà au moment de la réponse. */
export interface ConfirmationSentInfo {
  confirmationId: string;
  /** Nom tapé par la personne qui invite (jamais celui du compte). */
  tenantDisplayName: string;
  property: ConfirmationProperty | null;
  monthlyRent: number | null;
  startDate: string;
}

export const INVITE_CONFIRMATION_NOTE_ID = 'invite-confirmation-note';

/** Écran A1 : la phrase d'information sous le bouton « Inviter ». */
export function InviteConfirmationNote() {
  return (
    <p id={INVITE_CONFIRMATION_NOTE_ID} className="text-xs text-muted-foreground m-0 sm:text-right">
      Si cette personne a déjà un compte WARAH, nous lui demanderons de confirmer avant d&apos;activer le bail.
    </p>
  );
}

export function ConfirmationSentDialog({ sent, onClose }: { sent: ConfirmationSentInfo | null; onClose: () => void }) {
  return (
    <Dialog open={!!sent} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidth={520}>{sent && <ConfirmationSentBody sent={sent} onClose={onClose} />}</DialogContent>
    </Dialog>
  );
}

function ConfirmationSentBody({ sent, onClose }: { sent: ConfirmationSentInfo; onClose: () => void }) {
  // Les dates de rappel et d'expiration viennent du serveur (seule source) ;
  // tant qu'elles ne sont pas chargées, on affiche la règle générale.
  const { data } = useQuery({
    queryKey: LEASE_CONFIRMATIONS_QUERY_KEY,
    queryFn: leaseConfirmationsApi.list,
  });
  const request = data?.find((c) => c.id === sent.confirmationId);
  const first = firstNameOf(sent.tenantDisplayName);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Demande de confirmation envoyée</DialogTitle>
        <DialogDescription>
          {sent.tenantDisplayName} a déjà un compte WARAH. Nous lui demandons de confirmer. Le bail sera actif dès {que(first)} accepte.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        {sent.property && (
          <div className="rounded-lg border border-ds-border bg-ds-secondary px-4 py-3.5 text-sm">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <div className="font-bold text-foreground">{propertyTitle(sent.property)}</div>
                <div className="text-xs text-muted-foreground">{sent.property.neighborhood}, {sent.property.city}</div>
              </div>
            </div>
            <div className="mt-2 text-foreground">
              {sent.monthlyRent !== null && <><b className="tabular-nums">{formatFcfa(sent.monthlyRent)}</b> / mois, </>}
              à partir du {formatFullDate(sent.startDate)}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-bold text-foreground m-0 mb-2.5">Ce qui se passe maintenant</h3>
          <ol className="list-none m-0 p-0 flex flex-col gap-3">
            <Step n={1} title={`${first} reçoit la demande`}>
              Par email et dans son espace WARAH, et aussi par WhatsApp si {first} l&apos;a activé.
            </Step>
            <Step n={2} title={`${first} répond « Oui » ou « Ce n'est pas moi »`}>
              Rappels automatiques à 2 et 5 jours
              {request?.nextReminderAt ? ` (prochain le ${formatDayMonth(request.nextReminderAt)})` : ''}.
            </Step>
            <Step n={3} title="Le bail devient actif">
              L&apos;échéancier est créé et nous vous prévenons. Sans réponse, la demande expire{' '}
              {request ? `le ${formatFullDate(request.expiresAt)}` : 'au bout de 7 jours'}.
            </Step>
          </ol>
        </div>

        <p className="m-0 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3.5 py-2.5 text-sm">
          En attendant : aucun rappel de loyer, aucun lien de paiement, et l&apos;annonce de ce bien est mise en pause.
        </p>

        <div className="flex justify-end">
          <Button type="button" size="lg" className={`${TOUCH_BUTTON} w-full sm:w-auto`} onClick={onClose}>
            Compris
          </Button>
        </div>
      </div>
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-7 h-7 rounded-full bg-primary-50 text-primary dark:bg-primary/20 dark:text-foreground text-xs font-bold flex items-center justify-center shrink-0" aria-hidden="true">
        {n}
      </span>
      <div className="text-sm">
        <div className="font-semibold text-foreground">{title}</div>
        <div className="text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}

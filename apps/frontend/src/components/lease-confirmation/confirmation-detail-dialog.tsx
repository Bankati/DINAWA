'use client';

import { useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ds';
import { ApiError } from '@/lib/api';
import { formatFcfa } from '@/lib/format';
import {
  badgeFor,
  firstNameOf,
  formatDayMonth,
  formatFullDate,
  leaseConfirmationsApi,
  propertyTitle,
  type LeaseConfirmation,
} from '@/lib/lease-confirmations';
import { TOUCH_BUTTON } from './touch';

// Écran B2 : la fiche d'une demande en attente, ouverte par « Voir la
// demande ». Où en est la demande, par où elle est partie, ce qui est
// suspendu, et le bouton « Annuler la demande » (choix 3 du boss, 09/11).

export interface ConfirmationDetailDialogProps {
  confirmation: LeaseConfirmation | null;
  /** Bien sous mandat d'un gestionnaire : le propriétaire consulte sans agir. */
  readOnly?: boolean;
  onClose: () => void;
  onCancelled: (c: LeaseConfirmation) => void;
  /** La demande n'est plus en attente côté serveur : la liste doit être rechargée. */
  onStale: () => void;
}

export function ConfirmationDetailDialog({ confirmation, readOnly, onClose, onCancelled, onStale }: ConfirmationDetailDialogProps) {
  return (
    <Dialog open={!!confirmation} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidth={520}>
        {confirmation && (
          <DetailBody
            key={confirmation.id}
            c={confirmation}
            readOnly={!!readOnly}
            onClose={onClose}
            onCancelled={onCancelled}
            onStale={onStale}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ordinal(n: number): string {
  return n === 1 ? '1er' : `${n}e`;
}

function DetailBody({
  c,
  readOnly,
  onClose,
  onCancelled,
  onStale,
}: {
  c: LeaseConfirmation;
  readOnly: boolean;
  onClose: () => void;
  onCancelled: (c: LeaseConfirmation) => void;
  onStale: () => void;
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const first = firstNameOf(c.tenantDisplayName);
  const badge = badgeFor(c);
  const { property } = c.lease;
  const resendHintId = `lc-${c.id}-resend-hint`;

  async function cancel() {
    if (inFlight.current) return;
    inFlight.current = true;
    setCancelling(true);
    setError('');
    try {
      await leaseConfirmationsApi.cancel(c.id);
      onCancelled(c);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 409 || err.status === 400 || err.status === 404)) {
        setError(`Cette demande n'est plus en attente : ${first} vient peut-être d'y répondre. La liste a été mise à jour.`);
        onStale();
      } else {
        setError("L'annulation n'a pas abouti. Vérifiez votre connexion, puis réessayez.");
      }
    } finally {
      inFlight.current = false;
      setCancelling(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Demande — {c.tenantDisplayName}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <Badge tone={badge.tone} dot className="self-start">{badge.label}</Badge>

        <div className="rounded-lg border border-ds-border bg-ds-secondary px-4 py-3.5 text-sm">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <div className="font-bold text-foreground">{propertyTitle(property)}</div>
              <div className="text-xs text-muted-foreground">{property.neighborhood}, {property.city}</div>
            </div>
          </div>
          <div className="mt-2 text-foreground">
            <b className="tabular-nums">{formatFcfa(c.lease.monthlyRent)}</b> / mois, à partir du {formatFullDate(c.lease.startDate)}
          </div>
        </div>

        <ol className="list-none m-0 p-0 flex flex-col gap-3 border-l-2 border-ds-border ml-1.5 pl-4">
          <TimelineItem done title={`Demande envoyée le ${formatDayMonth(c.sentAt)}`}>
            Par email et dans son espace WARAH, et aussi par WhatsApp si {first} l&apos;a activé.
          </TimelineItem>
          {c.remindersSentAt.map((at, i) => (
            <TimelineItem key={at} done title={`${ordinal(i + 1)} rappel envoyé le ${formatDayMonth(at)}`} />
          ))}
          {c.nextReminderAt && (
            <TimelineItem title={`${ordinal(c.remindersSentAt.length + 1)} rappel prévu le ${formatDayMonth(c.nextReminderAt)}`} />
          )}
          <TimelineItem title={`Expire le ${formatDayMonth(c.expiresAt)} sans réponse`} />
        </ol>

        <p className="m-0 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3.5 py-2.5 text-sm">
          Pendant l&apos;attente : aucun rappel de loyer, aucun lien de paiement. L&apos;annonce de ce bien est en pause.
        </p>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3.5 py-2.5 text-sm">{error}</div>
        )}

        {readOnly ? (
          <>
            <p className="text-xs text-muted-foreground m-0">
              Ce bien est géré par un gestionnaire (mandat actif) : seul le gestionnaire peut annuler ou renvoyer cette demande.
            </p>
            <div className="flex justify-end">
              <Button type="button" variant="secondary" size="lg" className={`${TOUCH_BUTTON} w-full sm:w-auto`} onClick={onClose}>Fermer</Button>
            </div>
          </>
        ) : confirmingCancel ? (
          <div className="rounded-lg border border-red-200 bg-red-50/60 dark:bg-red-950/20 px-4 py-3.5 flex flex-col gap-3">
            <p className="m-0 text-sm text-foreground">
              <b>Annuler la demande ?</b> Le bail en attente sera annulé et {first} ne pourra plus y répondre.
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className={`${TOUCH_BUTTON} w-full sm:w-auto`}
                onClick={() => setConfirmingCancel(false)}
                disabled={cancelling}
              >
                Garder la demande
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="lg"
                className={`${TOUCH_BUTTON} w-full sm:w-auto`}
                onClick={cancel}
                loading={cancelling}
              >
                {cancelling ? 'Annulation en cours…' : 'Oui, annuler la demande'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <Button type="button" variant="outline" size="lg" className={`${TOUCH_BUTTON} w-full`} disabled aria-describedby={resendHintId}>
              Renvoyer
            </Button>
            <p id={resendHintId} className="text-xs text-muted-foreground m-0 text-center">
              Le renvoi sera possible si la demande expire ({formatDayMonth(c.expiresAt)}).
            </p>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className={`${TOUCH_BUTTON} w-full text-destructive hover:bg-red-50 dark:hover:bg-red-950/30`}
              onClick={() => setConfirmingCancel(true)}
            >
              Annuler la demande
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function TimelineItem({ title, done, children }: { title: string; done?: boolean; children?: React.ReactNode }) {
  return (
    <li className="relative text-sm">
      <span
        className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 ${done ? 'bg-primary border-primary' : 'bg-card border-ds-border'}`}
        aria-hidden="true"
      />
      <div className={done ? 'font-semibold text-foreground' : 'text-foreground'}>{title}</div>
      {children && <div className="text-xs text-muted-foreground mt-0.5">{children}</div>}
    </li>
  );
}

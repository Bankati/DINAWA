'use client';

import { useRef, useState } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Label } from '@/components/ds';
import { ApiError } from '@/lib/api';
import { formatFcfa } from '@/lib/format';
import {
  MAX_REFUSALS,
  firstNameOf,
  formatFullDate,
  leaseConfirmationsApi,
  propertyShortLabel,
  type LeaseConfirmation,
  type ResendLeaseConfirmationBody,
} from '@/lib/lease-confirmations';
import { TOUCH_BUTTON } from './touch';

// Écran B3 : après un refus, le numéro est sans doute faux — on le montre,
// modifiable, avant de renvoyer. Après une expiration, même fenêtre, contact
// déjà rempli.

export interface ResendConfirmationDialogProps {
  confirmation: LeaseConfirmation | null;
  onClose: () => void;
  /** `response` : réponse brute du serveur (peut contenir un lien d'invitation classique). */
  onResent: (c: LeaseConfirmation, response: unknown, contact: { phone: string; email: string }) => void;
  /** Le serveur a refusé le renvoi (état changé entre-temps) : la liste doit être rechargée. */
  onStale: () => void;
}

export function ResendConfirmationDialog({ confirmation, onClose, onResent, onStale }: ResendConfirmationDialogProps) {
  return (
    <Dialog open={!!confirmation} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidth={520}>
        {confirmation && (
          <ResendForm key={confirmation.id} c={confirmation} onClose={onClose} onResent={onResent} onStale={onStale} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Corps de la requête : seulement les champs que la personne a corrigés. */
export function resendBody(c: Pick<LeaseConfirmation, 'phone' | 'email'>, phone: string, email: string): ResendLeaseConfirmationBody {
  const body: ResendLeaseConfirmationBody = {};
  if (phone.trim() && phone.trim() !== (c.phone ?? '').trim()) body.phone = phone.trim();
  if (email.trim() && email.trim() !== (c.email ?? '').trim()) body.email = email.trim();
  return body;
}

function ResendForm({
  c,
  onClose,
  onResent,
  onStale,
}: {
  c: LeaseConfirmation;
  onClose: () => void;
  onResent: ResendConfirmationDialogProps['onResent'];
  onStale: () => void;
}) {
  const [phone, setPhone] = useState(c.phone ?? '');
  const [email, setEmail] = useState(c.email ?? '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const first = firstNameOf(c.tenantDisplayName);
  const refused = c.status === 'REFUSED';
  const phoneId = `lc-${c.id}-phone`;
  const emailId = `lc-${c.id}-email`;

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    setError('');
    try {
      const response = await leaseConfirmationsApi.resend(c.id, resendBody(c, phone, email));
      onResent(c, response, { phone: phone.trim(), email: email.trim() });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        // Contact refusé par la validation du serveur : son message est utile.
        setError(err.message);
      } else if (err instanceof ApiError && (err.status === 409 || err.status === 403)) {
        setError("Cette demande ne peut plus être renvoyée. La liste a été mise à jour.");
        onStale();
      } else {
        setError("L'envoi n'a pas abouti. Vérifiez votre connexion, puis appuyez de nouveau sur « Renvoyer ».");
      }
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Vérifier et renvoyer</DialogTitle>
        <DialogDescription>
          {refused ? (
            <>
              {first} n&apos;a pas confirmé, vérifiez le numéro. La personne qui a reçu la demande a répondu
              « Ce n&apos;est pas moi ».
            </>
          ) : (
            <>{first} n&apos;a pas répondu en 7 jours. Vérifiez le numéro et l&apos;email, puis renvoyez la demande.</>
          )}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor={phoneId}>Téléphone <span className="text-destructive" aria-hidden="true">*</span></Label>
          <Input
            id={phoneId}
            className="mt-1.5 min-h-12 text-base"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={sending}
          />
        </div>
        <div>
          <Label htmlFor={emailId}>Email <span className="text-destructive" aria-hidden="true">*</span></Label>
          <Input
            id={emailId}
            className="mt-1.5 min-h-12 text-base"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={sending}
          />
        </div>

        <p className="m-0 rounded-lg bg-ds-secondary px-3.5 py-2.5 text-sm text-foreground">
          {propertyShortLabel(c.lease.property)} · <b className="tabular-nums">{formatFcfa(c.lease.monthlyRent)}</b> / mois · à partir du{' '}
          {formatFullDate(c.lease.startDate)}
        </p>

        {refused && (
          <p className="m-0 text-xs text-muted-foreground">
            <b className="text-foreground">{c.refusalCount} refus sur {MAX_REFUSALS}.</b> Après {MAX_REFUSALS} refus de la même personne, la
            demande ne pourra plus être renvoyée.
          </p>
        )}

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3.5 py-2.5 text-sm">{error}</div>
        )}
        <p role="status" aria-live="polite" className="sr-only">{sending ? 'Envoi en cours…' : ''}</p>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <Button type="button" variant="secondary" size="lg" className={`${TOUCH_BUTTON} w-full sm:w-auto`} onClick={onClose} disabled={sending}>
            Annuler
          </Button>
          <Button type="submit" size="lg" className={`${TOUCH_BUTTON} w-full sm:w-auto`} loading={sending}>
            {sending ? 'Envoi en cours…' : 'Renvoyer'}
          </Button>
        </div>
      </form>
    </>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Badge, Button, Card, CardHeader, CardTitle } from '@/components/ds';
import { formatFcfa, initiales } from '@/lib/format';
import {
  LEASE_CONFIRMATIONS_QUERY_KEY,
  MAX_REFUSALS,
  badgeFor,
  confirmationView,
  firstNameOf,
  formatDayMonth,
  invitationUrlFrom,
  leaseConfirmationsApi,
  propertyShortLabel,
  visibleConfirmations,
  type LeaseConfirmation,
} from '@/lib/lease-confirmations';
import { ConfirmationDetailDialog } from './confirmation-detail-dialog';
import { ResendConfirmationDialog } from './resend-confirmation-dialog';
import { TOUCH_BUTTON } from './touch';

// Écran B1 : le bloc « Demandes de confirmation » au-dessus de la liste des
// locataires, avec ses 4 états (en attente, refusée, expirée, renvoi
// impossible). En cartes, y compris sur ordinateur : chaque état a une
// couleur ET un texte, jamais la couleur seule.

/** Infos pour rouvrir la fenêtre « Locataire invité » quand un renvoi devient une invitation classique. */
export interface InvitationFallback {
  invitationUrl: string;
  phone: string;
  firstName: string;
  whatsappBotNumber: string | null;
}

export interface ConfirmationRequestsSectionProps {
  /** Demande en lecture seule (bien sous mandat d'un gestionnaire, vu par le propriétaire). */
  isReadOnly?: (c: LeaseConfirmation) => boolean;
  onInvitationFallback?: (invite: InvitationFallback) => void;
}

export function ConfirmationRequestsSection({ isReadOnly, onInvitationFallback }: ConfirmationRequestsSectionProps) {
  const queryClient = useQueryClient();
  const { data, isError, refetch, isFetching } = useQuery({
    queryKey: LEASE_CONFIRMATIONS_QUERY_KEY,
    queryFn: leaseConfirmationsApi.list,
  });
  const [detail, setDetail] = useState<LeaseConfirmation | null>(null);
  const [resending, setResending] = useState<LeaseConfirmation | null>(null);
  const [notice, setNotice] = useState('');

  const items = visibleConfirmations(data ?? []);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: LEASE_CONFIRMATIONS_QUERY_KEY });
  }

  function handleCancelled(c: LeaseConfirmation) {
    setDetail(null);
    setNotice(`La demande à ${c.tenantDisplayName} a été annulée.`);
    refresh();
    void queryClient.invalidateQueries({ queryKey: ['tenants'] });
  }

  function handleResent(c: LeaseConfirmation, response: unknown, contact: { phone: string; email: string }) {
    setResending(null);
    refresh();
    void queryClient.invalidateQueries({ queryKey: ['tenants'] });
    const invitationUrl = invitationUrlFrom(response);
    if (invitationUrl) {
      // Le contact corrigé ne correspond à aucun compte : parcours actuel
      // (bail actif tout de suite et lien d'activation à transmettre).
      setNotice(`${c.tenantDisplayName} n'a pas encore de compte : le bail est actif et un lien d'activation a été créé.`);
      const bot = (response as { whatsappBotNumber?: unknown }).whatsappBotNumber;
      onInvitationFallback?.({
        invitationUrl,
        phone: contact.phone,
        firstName: firstNameOf(c.tenantDisplayName),
        whatsappBotNumber: typeof bot === 'string' ? bot : null,
      });
    } else {
      setNotice(`La demande a été renvoyée à ${c.tenantDisplayName}.`);
    }
  }

  if (isError && !data) {
    return (
      <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm flex items-center justify-between gap-3 flex-wrap">
        <span>Les demandes de confirmation n&apos;ont pas pu être chargées.</span>
        <Button type="button" variant="outline" size="lg" className={TOUCH_BUTTON} onClick={() => refetch()} loading={isFetching}>
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Toujours présent : le message d'une annulation reste lisible même quand la liste se vide. */}
      <p role="status" aria-live="polite" className={notice ? 'mb-3 rounded-lg border border-green-200 bg-green-50 text-green-800 px-4 py-2.5 text-sm' : 'sr-only'}>
        {notice}
      </p>

      {items.length > 0 && (
        <Card className="mb-5" aria-labelledby="lc-section-title" role="region">
          <CardHeader>
            <CardTitle id="lc-section-title">Demandes de confirmation</CardTitle>
            <Badge tone="neutral">{items.length}</Badge>
          </CardHeader>
          <ul className="list-none m-0 p-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((c) => (
              <RequestCard
                key={c.id}
                c={c}
                readOnly={isReadOnly?.(c) ?? false}
                onOpen={() => setDetail(c)}
                onResend={() => setResending(c)}
              />
            ))}
          </ul>
        </Card>
      )}

      <ConfirmationDetailDialog
        confirmation={detail}
        readOnly={detail ? isReadOnly?.(detail) : false}
        onClose={() => setDetail(null)}
        onCancelled={handleCancelled}
        onStale={refresh}
      />
      <ResendConfirmationDialog
        confirmation={resending}
        onClose={() => setResending(null)}
        onResent={handleResent}
        onStale={refresh}
      />
    </>
  );
}

function RequestCard({
  c,
  readOnly,
  onOpen,
  onResend,
}: {
  c: LeaseConfirmation;
  readOnly: boolean;
  onOpen: () => void;
  onResend: () => void;
}) {
  const view = confirmationView(c);
  const badge = badgeFor(c);
  const [firstName, ...rest] = c.tenantDisplayName.trim().split(/\s+/);
  const first = firstNameOf(c.tenantDisplayName);
  const contact = c.phone ?? c.email;

  return (
    <li className="rounded-lg border border-ds-border bg-background p-4 flex flex-col gap-2.5 min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-9 h-9 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0" aria-hidden="true">
          {initiales(firstName, rest[rest.length - 1])}
        </span>
        <div className="min-w-0">
          <div className="font-semibold text-foreground truncate">{c.tenantDisplayName}</div>
          {contact && <div className="text-xs text-muted-foreground truncate">{contact}</div>}
        </div>
      </div>

      <Badge tone={badge.tone} dot className="self-start">{badge.label}</Badge>

      <div className="text-sm text-foreground">
        {propertyShortLabel(c.lease.property)} · <b className="tabular-nums">{formatFcfa(c.lease.monthlyRent)}</b>
      </div>

      {view === 'pending' && (
        <p className="text-xs text-muted-foreground m-0">
          Envoyée le {formatDayMonth(c.sentAt)}
          {c.nextReminderAt && <> · rappel le {formatDayMonth(c.nextReminderAt)}</>} · expire le {formatDayMonth(c.expiresAt)}
        </p>
      )}
      {view === 'refused' && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-xs">
          {first} n&apos;a pas confirmé, vérifiez le numéro.{' '}
          <span className="inline-block font-bold whitespace-nowrap">{c.refusalCount} refus sur {MAX_REFUSALS}</span>
        </div>
      )}
      {view === 'expired' && (
        <p className="text-xs text-muted-foreground m-0">Pas de réponse en 7 jours. L&apos;annonce du bien est de nouveau en ligne.</p>
      )}
      {view === 'blocked' && (
        <p className="text-xs text-muted-foreground m-0">
          {c.refusalCount >= MAX_REFUSALS
            ? `Cette personne a refusé ${c.refusalCount} fois : le renvoi n'est plus possible.`
            : "Le renvoi n'est plus possible pour cette demande."}{' '}
          Si c&apos;est une erreur, contactez le support WARAH.
        </p>
      )}

      <div className="mt-auto pt-1">
        {view === 'pending' && (
          <Button type="button" variant="outline" size="lg" className={`${TOUCH_BUTTON} w-full`} onClick={onOpen} aria-label={`Voir la demande à ${c.tenantDisplayName}`}>
            Voir la demande
          </Button>
        )}
        {view === 'refused' && !readOnly && (
          <Button type="button" size="lg" className={`${TOUCH_BUTTON} w-full`} onClick={onResend}>
            Vérifier le numéro et renvoyer
          </Button>
        )}
        {view === 'expired' && !readOnly && (
          <Button type="button" size="lg" className={`${TOUCH_BUTTON} w-full`} onClick={onResend}>
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Renvoyer la demande
          </Button>
        )}
        {view === 'blocked' && (
          <Button type="button" variant="outline" size="lg" className={`${TOUCH_BUTTON} w-full`} disabled>
            Renvoi impossible
          </Button>
        )}
        {(view === 'refused' || view === 'expired') && readOnly && (
          <p className="text-xs text-muted-foreground m-0">Bien géré par un gestionnaire : seul le gestionnaire peut renvoyer la demande.</p>
        )}
      </div>
    </li>
  );
}

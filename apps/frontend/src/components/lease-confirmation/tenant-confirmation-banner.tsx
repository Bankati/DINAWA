'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Home, MapPin, Banknote, Calendar, Check, Info, Clock } from 'lucide-react';
import { Button } from '@/components/ds';
import { formatFcfa } from '@/lib/format';
import {
  ACTIVE_LEASE_MESSAGE,
  MY_LEASE_CONFIRMATIONS_QUERY_KEY,
  classifyAnswerError,
  formatFullDate,
  leaseConfirmationsApi,
  propertyTitle,
  type MyLeaseConfirmation,
  type TenantAnswerError,
} from '@/lib/lease-confirmations';
import { TOUCH_BUTTON } from './touch';

// Écrans D, E1 et E2 des maquettes validées le 09/11/2026 : la demande en
// haut du tableau de bord du locataire, puis l'écran qui suit sa réponse.

type Outcome = 'accepted' | 'refused' | 'expired' | 'already-answered';

interface AnsweredItem {
  item: MyLeaseConfirmation;
  outcome: Outcome;
}

export interface TenantConfirmationBannerProps {
  confirmations: MyLeaseConfirmation[];
}

export function TenantConfirmationBanner({ confirmations }: TenantConfirmationBannerProps) {
  const queryClient = useQueryClient();
  // Les réponses sont gardées ici : une fois la liste rechargée, la demande
  // n'y est plus (elle n'est plus « en attente »), mais l'écran qui suit la
  // réponse doit rester affiché jusqu'à ce que la personne le ferme.
  const [answered, setAnswered] = useState<AnsweredItem[]>([]);
  // Une demande répondue puis refermée ne doit pas réapparaître si la liste
  // n'a pas encore été rechargée.
  const [closedIds, setClosedIds] = useState<ReadonlySet<string>>(new Set());
  const [announcement, setAnnouncement] = useState('');

  function handleOutcome(item: MyLeaseConfirmation, outcome: Outcome) {
    setAnswered((list) => [...list.filter((a) => a.item.id !== item.id), { item, outcome }]);
    setAnnouncement(OUTCOME_ANNOUNCEMENTS[outcome]);
    void queryClient.invalidateQueries({ queryKey: MY_LEASE_CONFIRMATIONS_QUERY_KEY });
    if (outcome === 'accepted') {
      void queryClient.invalidateQueries({ queryKey: ['locataire-leases'] });
    }
  }

  function close(id: string) {
    setAnswered((list) => list.filter((a) => a.item.id !== id));
    setClosedIds((ids) => new Set(ids).add(id));
    setAnnouncement('');
  }

  const hiddenIds = new Set([...answered.map((a) => a.item.id), ...closedIds]);
  const pending = confirmations.filter((c) => !hiddenIds.has(c.id));

  if (pending.length === 0 && answered.length === 0 && closedIds.size === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {answered.map(({ item, outcome }) => (
        <OutcomePanel key={item.id} item={item} outcome={outcome} onClose={() => close(item.id)} />
      ))}
      {pending.map((c) => (
        <ConfirmationRequestCard key={c.id} confirmation={c} onOutcome={handleOutcome} />
      ))}
      {/* Zone d'annonce gardée en place pour que le lecteur d'écran lise le résultat. */}
      <p role="status" aria-live="polite" className="sr-only">{announcement}</p>
    </div>
  );
}

const OUTCOME_ANNOUNCEMENTS: Record<Outcome, string> = {
  accepted: "C'est confirmé ! Votre bail est actif.",
  refused: "C'est noté, merci. Ce logement n'a pas été ajouté à votre compte.",
  expired: "Cette demande n'est plus en cours. Rien n'a changé sur votre compte.",
  'already-answered': "Vous avez déjà répondu à cette demande. Rien d'autre à faire.",
};

// ── D : la demande ───────────────────────────────────────────────────────

type Sending = 'accept' | 'refuse' | null;
type CardError = Extract<TenantAnswerError, 'active-lease' | 'network'>;

export function ConfirmationRequestCard({
  confirmation: c,
  onOutcome,
}: {
  confirmation: MyLeaseConfirmation;
  onOutcome: (item: MyLeaseConfirmation, outcome: Outcome) => void;
}) {
  const [sending, setSending] = useState<Sending>(null);
  const [error, setError] = useState<CardError | null>(null);
  // Garde synchrone : deux appuis rapprochés avant le nouveau rendu ne
  // doivent envoyer qu'une seule réponse.
  const inFlight = useRef(false);
  const titleId = `lc-${c.id}-title`;
  const hintId = `lc-${c.id}-hint`;
  const { property } = c.lease;

  async function answer(kind: 'accept' | 'refuse') {
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(kind);
    setError(null);
    try {
      if (kind === 'accept') {
        await leaseConfirmationsApi.accept(c.id);
        onOutcome(c, 'accepted');
      } else {
        await leaseConfirmationsApi.refuse(c.id);
        onOutcome(c, 'refused');
      }
    } catch (err) {
      const kindOfError = classifyAnswerError(err);
      if (kindOfError === 'expired' || kindOfError === 'already-answered') {
        onOutcome(c, kindOfError);
      } else {
        setError(kindOfError);
      }
    } finally {
      inFlight.current = false;
      setSending(null);
    }
  }

  const busy = sending !== null;

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-xl border-2 border-primary/30 bg-card shadow-sm overflow-hidden"
    >
      <div className="flex items-start gap-3 px-4 py-3.5 bg-primary-50 dark:bg-primary/15 border-b border-primary/15">
        <span className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0" aria-hidden="true">
          <Home className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h2 id={titleId} className="text-[15px] font-bold text-foreground m-0 leading-snug">
            {c.inviterDisplayName} vous ajoute comme locataire
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 m-0">Expire le {formatFullDate(c.expiresAt)}</p>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3.5">
        <ul className="list-none m-0 p-3.5 rounded-lg bg-ds-secondary flex flex-col gap-2 text-sm text-foreground">
          <li className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              <b>{propertyTitle(property)}</b>
              {propertyTitle(property) !== property.neighborhood && `, ${property.neighborhood}`}, {property.city}
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Banknote className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span><b className="tabular-nums">{formatFcfa(c.lease.monthlyRent)}</b> par mois</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Calendar className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>À partir du {formatFullDate(c.lease.startDate)}</span>
          </li>
        </ul>

        <p className="text-base font-bold text-foreground m-0">Est-ce bien votre logement ?</p>

        {error === 'active-lease' && (
          <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3.5 py-3 text-sm">
            <p className="m-0 font-semibold">{ACTIVE_LEASE_MESSAGE}</p>
            <p className="m-0 mt-1">
              Cette demande reste en attente jusqu&apos;au {formatFullDate(c.expiresAt)} : vous pourrez répondre
              « Oui, c&apos;est mon logement » quand ce sera fait.
            </p>
          </div>
        )}
        {error === 'network' && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3.5 py-3 text-sm">
            Votre réponse n&apos;est pas partie. Vérifiez votre connexion, puis appuyez de nouveau.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5">
          <Button
            type="button"
            size="lg"
            className={`${TOUCH_BUTTON} w-full sm:flex-1`}
            onClick={() => answer('accept')}
            disabled={busy}
            loading={sending === 'accept'}
            aria-describedby={hintId}
          >
            {sending === 'accept' ? 'Confirmation en cours…' : (
              <><Check className="w-4 h-4" aria-hidden="true" />Oui, c&apos;est mon logement</>
            )}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className={`${TOUCH_BUTTON} w-full sm:flex-1`}
            onClick={() => answer('refuse')}
            disabled={busy}
            loading={sending === 'refuse'}
            aria-describedby={hintId}
          >
            {sending === 'refuse' ? 'Envoi en cours…' : "Ce n'est pas moi"}
          </Button>
        </div>

        <p id={hintId} className="text-xs text-muted-foreground m-0">
          Vous ne connaissez pas {c.inviterDisplayName} ? Appuyez sur « Ce n&apos;est pas moi » : rien ne sera ajouté à votre compte.
        </p>

        {/* Annonce vocale de l'envoi en cours (les erreurs ont leur role="alert"). */}
        <p role="status" aria-live="polite" className="sr-only">
          {sending === 'accept' ? 'Confirmation en cours…' : sending === 'refuse' ? 'Envoi de votre réponse en cours…' : ''}
        </p>
      </div>
    </section>
  );
}

// ── E1, E2 et fins de parcours ───────────────────────────────────────────

function OutcomePanel({ item, outcome, onClose }: { item: MyLeaseConfirmation; outcome: Outcome; onClose: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Le focus va sur le titre : la personne (et son lecteur d'écran) sait
  // tout de suite que sa réponse est arrivée.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const inviter = item.inviterDisplayName;
  const { property } = item.lease;
  const headingId = `lc-${item.id}-outcome`;
  const headingClass = 'text-lg font-bold text-foreground m-0 outline-none';

  if (outcome === 'accepted') {
    return (
      <section aria-labelledby={headingId} className="rounded-xl border border-green-200 bg-card shadow-sm p-5 flex flex-col items-center text-center gap-3">
        <AnimatedCheck />
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className={headingClass}>C&apos;est confirmé !</h2>
        <p className="text-sm text-muted-foreground m-0">Votre bail est actif. Nous avons prévenu {inviter}.</p>
        <div className="w-full rounded-lg bg-ds-secondary px-4 py-3.5 text-left text-sm">
          <div className="font-bold text-foreground">{propertyTitle(property)}</div>
          <div className="text-xs text-muted-foreground">{property.neighborhood}, {property.city}</div>
          <div className="flex items-center justify-between gap-3 mt-2.5 flex-wrap">
            <span className="text-foreground">Premier loyer le {formatFullDate(item.lease.startDate)}</span>
            <b className="tabular-nums text-primary-dark dark:text-foreground">{formatFcfa(item.lease.monthlyRent)}</b>
          </div>
        </div>
        <p className="text-xs text-muted-foreground m-0">Vous recevrez un rappel avant chaque échéance.</p>
        <Button type="button" size="lg" className={`${TOUCH_BUTTON} w-full sm:w-auto`} onClick={onClose}>
          Voir mon tableau de bord
        </Button>
      </section>
    );
  }

  if (outcome === 'refused') {
    // Ton calme et couleur bleue : la personne n'a rien fait de mal.
    return (
      <section aria-labelledby={headingId} className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 p-5 flex flex-col gap-3">
        <span className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 flex items-center justify-center" aria-hidden="true">
          <Info className="w-5 h-5" />
        </span>
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className={headingClass}>C&apos;est noté, merci</h2>
        <p className="text-sm text-foreground m-0">
          Ce logement n&apos;a pas été ajouté à votre compte. Nous avons demandé à {inviter} de vérifier le numéro.
        </p>
        <p className="text-sm font-semibold text-foreground m-0">Vous n&apos;avez rien d&apos;autre à faire.</p>
        <p className="text-xs text-muted-foreground m-0">
          Vous avez appuyé par erreur ? Demandez à {inviter} de vous renvoyer la demande.
        </p>
        <Button type="button" size="lg" variant="outline" className={`${TOUCH_BUTTON} w-full sm:w-auto sm:self-start`} onClick={onClose}>
          Retour à mon tableau de bord
        </Button>
      </section>
    );
  }

  // Demande expirée (410) ou déjà traitée ailleurs (WhatsApp…) : jamais
  // d'erreur technique, seulement ce qu'il faut savoir.
  return (
    <section aria-labelledby={headingId} className="rounded-xl border border-ds-border bg-card shadow-sm p-5 flex flex-col gap-3">
      <span className="w-11 h-11 rounded-full bg-ds-secondary text-muted-foreground flex items-center justify-center" aria-hidden="true">
        {outcome === 'expired' ? <Clock className="w-5 h-5" /> : <Check className="w-5 h-5" />}
      </span>
      {outcome === 'expired' ? (
        <>
          <h2 id={headingId} ref={headingRef} tabIndex={-1} className={headingClass}>Cette demande n&apos;est plus en cours</h2>
          <p className="text-sm text-foreground m-0">Rien n&apos;a changé sur votre compte.</p>
          <p className="text-xs text-muted-foreground m-0">
            Si c&apos;est bien votre logement, demandez à {inviter} de vous renvoyer la demande.
          </p>
        </>
      ) : (
        <>
          <h2 id={headingId} ref={headingRef} tabIndex={-1} className={headingClass}>Vous avez déjà répondu à cette demande</h2>
          <p className="text-sm text-foreground m-0">
            Votre réponse a déjà été prise en compte (par exemple sur WhatsApp). Rien d&apos;autre à faire.
          </p>
        </>
      )}
      <Button type="button" size="lg" variant="outline" className={`${TOUCH_BUTTON} w-full sm:w-auto sm:self-start`} onClick={onClose}>
        Fermer
      </Button>
    </section>
  );
}

// Coche verte qui se trace en ~0,45 s ; affichée entière d'emblée si la
// personne a demandé à réduire les animations.
function AnimatedCheck() {
  return (
    <span className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" strokeDasharray={24} className="motion-safe:animate-[warah-check-draw_450ms_ease-out_150ms_both]" />
      </svg>
    </span>
  );
}

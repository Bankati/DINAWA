"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw } from "lucide-react";
import { ApiError } from "@/lib/api";
import { formatFcfa } from "@/lib/format";
import {
  PAY_LINK_EXPIRED_MESSAGE,
  PAY_LINK_INVALID_MESSAGE,
  PAY_LINK_OPERATORS,
  formatPayLinkDate,
  formatPayLinkPeriod,
  getPayLink,
  initiatePayLink,
  payLinkErrorKind,
  payLinkErrorMessage,
  type PayLinkErrorKind,
  type PayLinkOperator,
  type PayLinkView,
} from "@/lib/pay-links";
import { PayLinkShell, PayLinkSummary } from "../pay-link-ui";
import { useSlowFlag } from "../use-slow-flag";
import "../payer.css";

type LoadError = { kind: PayLinkErrorKind; message: string };

// Page publique du lien de paiement (unité 43) — sans connexion : le jeton
// de l'URL est la seule autorisation. Pensée d'abord pour le téléphone (on y
// arrive depuis WhatsApp ou un SMS).
export default function PayerPage() {
  return (
    <Suspense fallback={<PayLinkShell><LoadingState /></PayLinkShell>}>
      <PayerContent />
    </Suspense>
  );
}

function PayerContent() {
  const { token } = useParams<{ token: string }>();
  const cancelled = useSearchParams().get("paiement") === "annule";

  const [view, setView] = useState<PayLinkView | null>(null);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const slow = useSlowFlag(loading ? attempt : null);

  // Pas de useApi ici : son cache pourrait réafficher un ancien « à payer »
  // après le paiement. Chaque ouverture relit l'état réel du loyer.
  useEffect(() => {
    let active = true;
    getPayLink(token)
      .then((current) => {
        if (active) setView(current);
      })
      .catch((error: unknown) => {
        if (active) setLoadError({ kind: payLinkErrorKind(error), message: payLinkErrorMessage(error) });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, attempt]);

  function retry() {
    setLoading(true);
    setLoadError(null);
    setAttempt((n) => n + 1);
  }

  return (
    <PayLinkShell>
      {loading && <LoadingState slow={slow} onRetry={retry} />}
      {!loading && loadError && <LoadErrorState error={loadError} onRetry={retry} />}
      {!loading && view && <PayLinkContent token={token} view={view} cancelled={cancelled} />}
    </PayLinkShell>
  );
}

function LoadErrorState({ error, onRetry }: { error: LoadError; onRetry: () => void }) {
  if (error.kind === "expired") {
    return (
      <div className="payer-state" role="alert">
        <Clock className="payer-state-icon" aria-hidden />
        <h1 className="payer-title">Ce lien a expiré</h1>
        <p className="payer-text">{PAY_LINK_EXPIRED_MESSAGE}</p>
      </div>
    );
  }

  if (error.kind === "invalid") {
    return (
      <div className="payer-state" role="alert">
        <AlertCircle className="payer-state-icon payer-state-icon--error" aria-hidden />
        <h1 className="payer-title">Lien non valide</h1>
        <p className="payer-text">{PAY_LINK_INVALID_MESSAGE}</p>
      </div>
    );
  }

  return (
    <div className="payer-state" role="alert">
      <AlertCircle className="payer-state-icon payer-state-icon--error" aria-hidden />
      <h1 className="payer-title">Chargement impossible</h1>
      <p className="payer-text">{error.message}</p>
      <button type="button" className="payer-btn payer-btn--secondary" onClick={onRetry}>
        <RefreshCw size={18} aria-hidden /> Réessayer
      </button>
    </div>
  );
}

function PayLinkContent({ token, view, cancelled }: { token: string; view: PayLinkView; cancelled: boolean }) {
  if (view.status === "PAID") {
    return (
      <div className="payer-state">
        <CheckCircle2 className="payer-state-icon payer-state-icon--success" aria-hidden />
        <h1 className="payer-title">Ce loyer est déjà payé</h1>
        <p className="payer-text">
          {formatPayLinkPeriod(view)} de {view.tenantFirstName} est réglé. Il n&apos;y a rien à payer.
        </p>
      </div>
    );
  }

  return (
    <>
      <PayLinkSummary view={view} />
      {cancelled && (
        <p className="payer-notice" role="status">
          Le paiement n&apos;a pas abouti (annulé ou refusé). Vous pouvez réessayer quand vous voulez.
        </p>
      )}
      {view.status === "UNAVAILABLE" ? (
        <UnavailableActions token={token} />
      ) : (
        <PayActions token={token} view={view} />
      )}
      <p className="payer-footnote">Lien valable jusqu&apos;au {formatPayLinkDate(view.expiresAt)}.</p>
    </>
  );
}

function PayActions({ token, view }: { token: string; view: PayLinkView }) {
  const [pending, setPending] = useState<PayLinkOperator | null>(null);
  const [requestId, setRequestId] = useState(0);
  const [error, setError] = useState("");
  const lastRequest = useRef(0);
  const waiting = useRef(false);
  const slow = useSlowFlag(pending ? requestId : null);

  // Retour arrière depuis PayDunya : le navigateur (Safari surtout) restaure
  // la page figée depuis son cache, boutons encore bloqués sur « Ouverture… ».
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;
      lastRequest.current += 1;
      waiting.current = false;
      setPending(null);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  async function pay(operator: PayLinkOperator) {
    const id = ++lastRequest.current;
    waiting.current = true;
    setRequestId(id);
    setPending(operator);
    setError("");
    try {
      const { checkoutUrl } = await initiatePayLink(token, operator);
      // Après « Réessayer », le premier essai qui aboutit ouvre le paiement
      // (même loyer, même opérateur) : inutile d'attendre le second.
      if (!waiting.current) return;
      waiting.current = false;
      // Page PayDunya : le payeur y valide avec son code Mobile Money.
      window.location.assign(checkoutUrl);
    } catch (err) {
      if (id !== lastRequest.current) return;
      waiting.current = false;
      setError(payLinkErrorMessage(err));
      setPending(null);
    }
  }

  return (
    <div className="payer-actions">
      {view.paymentInProgress && (
        <p className="payer-notice" role="status">
          <Clock size={16} aria-hidden /> Un paiement est déjà en cours pour ce loyer : choisissez votre opérateur
          pour le reprendre.
        </p>
      )}
      {PAY_LINK_OPERATORS.map((operator) => {
        const isPending = pending === operator.value;
        return (
          <button
            key={operator.value}
            type="button"
            className="payer-btn payer-btn--primary"
            disabled={pending !== null}
            aria-busy={isPending || undefined}
            onClick={() => void pay(operator.value)}
          >
            {isPending ? (
              <Loader2 className="payer-spin" size={20} aria-hidden />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- petit logo statique local
              <img src={operator.logo} alt="" className="payer-operator-logo" />
            )}
            {isPending
              ? "Ouverture de la page de paiement…"
              : `Payer ${formatFcfa(view.totalAmount)} avec ${operator.label}`}
          </button>
        );
      })}
      <p className="payer-sr-only" role="status">
        {pending ? "Ouverture de la page de paiement…" : ""}
      </p>
      {slow && pending && (
        <div className="payer-slow" role="status">
          <p className="payer-text">
            La connexion est lente… La page de paiement met du temps à s&apos;ouvrir.
          </p>
          <button type="button" className="payer-btn payer-btn--secondary" onClick={() => void pay(pending)}>
            <RefreshCw size={18} aria-hidden /> Réessayer
          </button>
        </div>
      )}
      {error && (
        <p className="payer-error" role="alert">
          {error}
        </p>
      )}
      <p className="payer-footnote">
        La page sécurisée de PayDunya va s&apos;ouvrir : vous y validerez avec votre code Mobile Money.
      </p>
    </div>
  );
}

// Le responsable du bien n'a pas encore de numéro de reversement : le clic
// sur le bouton déclenche côté serveur la notification qui le prévient (au
// plus une fois par jour, PaymentsService) puis renvoie un refus explicite.
function UnavailableActions({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "pending" | "done">("idle");
  const [message, setMessage] = useState("");

  async function warnAgency() {
    setState("pending");
    try {
      // Si le numéro de reversement vient d'être ajouté, le paiement s'ouvre.
      const { checkoutUrl } = await initiatePayLink(token, "TMONEY");
      window.location.assign(checkoutUrl);
      return;
    } catch (err) {
      // 409 = refus attendu « numéro de reversement manquant » : le serveur
      // vient de prévenir l'agence. Tout autre échec est affiché tel quel.
      setMessage(err instanceof ApiError && err.status === 409 ? "" : payLinkErrorMessage(err));
    }
    setState("done");
  }

  return (
    <div className="payer-actions">
      <p className="payer-notice payer-notice--warning" role="status">
        Le paiement en ligne n&apos;est pas encore disponible pour ce logement. Vous pouvez prévenir votre agence ou
        la contacter directement.
      </p>
      {state === "done" ? (
        <p className="payer-text" role="status">
          {message || "Votre agence a été prévenue."}
        </p>
      ) : (
        <button
          type="button"
          className="payer-btn payer-btn--secondary"
          disabled={state === "pending"}
          onClick={() => void warnAgency()}
        >
          {state === "pending" && <Loader2 className="payer-spin" size={18} aria-hidden />}
          Prévenir mon agence
        </button>
      )}
    </div>
  );
}

function LoadingState({ slow = false, onRetry }: { slow?: boolean; onRetry?: () => void }) {
  return (
    <div className="payer-state" role="status" aria-live="polite">
      <Loader2 className="payer-state-icon payer-spin" aria-hidden />
      <p className="payer-text">Chargement du loyer…</p>
      {slow && onRetry && (
        <div className="payer-slow">
          <p className="payer-text">La connexion est lente… Le chargement continue, vous pouvez aussi réessayer.</p>
          <button type="button" className="payer-btn payer-btn--secondary" onClick={onRetry}>
            <RefreshCw size={18} aria-hidden /> Réessayer
          </button>
        </div>
      )}
    </div>
  );
}

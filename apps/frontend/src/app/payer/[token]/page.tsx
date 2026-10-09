"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw } from "lucide-react";
import { ApiError } from "@/lib/api";
import { formatFcfa } from "@/lib/format";
import {
  PAY_LINK_OPERATORS,
  formatPayLinkDate,
  formatPayLinkPeriod,
  getPayLink,
  initiatePayLink,
  payLinkErrorMessage,
  type PayLinkOperator,
  type PayLinkView,
} from "@/lib/pay-links";
import { PayLinkShell, PayLinkSummary } from "../pay-link-ui";
import "../payer.css";

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
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  // Pas de useApi ici : son cache pourrait réafficher un ancien « à payer »
  // après le paiement. Chaque ouverture relit l'état réel du loyer.
  useEffect(() => {
    let active = true;
    getPayLink(token)
      .then((current) => {
        if (active) setView(current);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(payLinkErrorMessage(error));
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
    setLoadError("");
    setAttempt((n) => n + 1);
  }

  return (
    <PayLinkShell>
      {loading && <LoadingState />}
      {!loading && loadError && (
        <div className="payer-state" role="alert">
          <AlertCircle className="payer-state-icon payer-state-icon--error" aria-hidden />
          <h1 className="payer-title">Lien indisponible</h1>
          <p className="payer-text">{loadError}</p>
          <button type="button" className="payer-btn payer-btn--secondary" onClick={retry}>
            <RefreshCw size={18} aria-hidden /> Réessayer
          </button>
        </div>
      )}
      {!loading && view && <PayLinkContent token={token} view={view} cancelled={cancelled} />}
    </PayLinkShell>
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
          Le paiement a été annulé. Vous pouvez réessayer quand vous voulez.
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
  const [error, setError] = useState("");

  async function pay(operator: PayLinkOperator) {
    setPending(operator);
    setError("");
    try {
      const { checkoutUrl } = await initiatePayLink(token, operator);
      // Page PayDunya : le payeur y valide avec son code Mobile Money.
      window.location.assign(checkoutUrl);
    } catch (err) {
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
      {PAY_LINK_OPERATORS.map((operator) => (
        <button
          key={operator.value}
          type="button"
          className="payer-btn payer-btn--primary"
          disabled={pending !== null}
          onClick={() => void pay(operator.value)}
        >
          {pending === operator.value ? (
            <Loader2 className="payer-spin" size={20} aria-hidden />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- petit logo statique local
            <img src={operator.logo} alt="" className="payer-operator-logo" />
          )}
          Payer {formatFcfa(view.totalAmount)} avec {operator.label}
        </button>
      ))}
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

function LoadingState() {
  return (
    <div className="payer-state" role="status" aria-live="polite">
      <Loader2 className="payer-state-icon payer-spin" aria-hidden />
      <p className="payer-text">Chargement du loyer…</p>
    </div>
  );
}

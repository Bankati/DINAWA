"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw } from "lucide-react";
import {
  formatPayLinkPeriod,
  getPayLink,
  payLinkErrorKind,
  payLinkErrorMessage,
  type PayLinkErrorKind,
  type PayLinkView,
} from "@/lib/pay-links";
import { PayLinkShell } from "../../pay-link-ui";
import { useSlowFlag } from "../../use-slow-flag";
import "../../payer.css";

// Relectures de l'état du loyer après le retour de PayDunya : la vraie
// confirmation arrive par le webhook PayDunya (ou le cron de réconciliation,
// toutes les 15 min) — cette page NE valide RIEN, elle se contente de
// constater. Ouvrir /merci sans avoir payé ne change donc rien au loyer.
const CHECK_INTERVAL_MS = 5_000;
const MAX_CHECKS = 6;

export default function PayerMerciPage() {
  const { token } = useParams<{ token: string }>();
  const [view, setView] = useState<PayLinkView | null>(null);
  const [error, setError] = useState<{ kind: PayLinkErrorKind; message: string } | null>(null);
  const [checksDone, setChecksDone] = useState(0);
  // Chaque « Vérifier à nouveau » relance une série complète de vérifications.
  const [round, setRound] = useState(0);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check(attempt: number) {
      try {
        const current = await getPayLink(token);
        if (stopped) return;
        setView(current);
        setError(null);
        setChecksDone(attempt);
        if (current.status !== "PAID" && attempt < MAX_CHECKS) {
          timer = setTimeout(() => void check(attempt + 1), CHECK_INTERVAL_MS);
        }
      } catch (err) {
        if (stopped) return;
        setError({ kind: payLinkErrorKind(err), message: payLinkErrorMessage(err) });
        setChecksDone(MAX_CHECKS);
      }
    }

    void check(1);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [token, round]);

  function checkAgain() {
    setError(null);
    setChecksDone(0);
    setRound((n) => n + 1);
  }

  const confirmed = view?.status === "PAID";
  const stillChecking = !confirmed && !error && checksDone < MAX_CHECKS;
  // Sans nouvelle depuis 15 s (une vérification qui traîne), on le dit.
  const slow = useSlowFlag(stillChecking ? round * (MAX_CHECKS + 1) + checksDone : null);
  const canRetry = !error || error.kind === "retryable";

  return (
    <PayLinkShell>
      <div className="payer-state" aria-live="polite">
        {confirmed ? (
          <>
            <CheckCircle2 className="payer-state-icon payer-state-icon--success" aria-hidden />
            <h1 className="payer-title">Paiement confirmé</h1>
            <p className="payer-text">
              Merci ! {view ? `${formatPayLinkPeriod(view)} de ${view.tenantFirstName} est réglé.` : ""} La quittance
              est envoyée au locataire.
            </p>
          </>
        ) : stillChecking ? (
          <>
            <Loader2 className="payer-state-icon payer-spin" aria-hidden />
            <h1 className="payer-title">Merci !</h1>
            <p className="payer-text">
              Votre paiement est en cours de vérification. Dès qu&apos;il est confirmé, la quittance est envoyée au
              locataire.
            </p>
            {slow && (
              <div className="payer-slow">
                <p className="payer-text">La connexion est lente… La vérification continue.</p>
                <button type="button" className="payer-btn payer-btn--secondary" onClick={checkAgain}>
                  <RefreshCw size={18} aria-hidden /> Vérifier à nouveau
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {error ? (
              <AlertCircle className="payer-state-icon payer-state-icon--error" aria-hidden />
            ) : (
              <Clock className="payer-state-icon" aria-hidden />
            )}
            <h1 className="payer-title">{error ? "Vérification impossible" : "Paiement pas encore confirmé"}</h1>
            {error ? (
              <p className="payer-error">{error.message}</p>
            ) : (
              <p className="payer-text">Nous n&apos;avons pas encore reçu la confirmation de votre opérateur.</p>
            )}
            {canRetry && (
              <>
                <p className="payer-text">
                  Si votre opérateur vous a confirmé le retrait, inutile de payer à nouveau : la confirmation peut
                  prendre jusqu&apos;à 15 minutes. Sinon, vous pouvez réessayer.
                </p>
                <div className="payer-actions payer-actions--full">
                  <button type="button" className="payer-btn payer-btn--secondary" onClick={checkAgain}>
                    <RefreshCw size={18} aria-hidden /> Vérifier à nouveau
                  </button>
                  <Link href={`/payer/${token}`} className="payer-link">
                    Revenir à la page de paiement
                  </Link>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </PayLinkShell>
  );
}

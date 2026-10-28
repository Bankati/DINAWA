"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { formatPayLinkPeriod, getPayLink, payLinkErrorMessage, type PayLinkView } from "@/lib/pay-links";
import { PayLinkShell } from "../../pay-link-ui";
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
  const [error, setError] = useState("");
  const [checksDone, setChecksDone] = useState(0);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check(attempt: number) {
      try {
        const current = await getPayLink(token);
        if (stopped) return;
        setView(current);
        setError("");
        setChecksDone(attempt);
        if (current.status !== "PAID" && attempt < MAX_CHECKS) {
          timer = setTimeout(() => void check(attempt + 1), CHECK_INTERVAL_MS);
        }
      } catch (err) {
        if (stopped) return;
        setError(payLinkErrorMessage(err));
        setChecksDone(MAX_CHECKS);
      }
    }

    void check(1);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [token]);

  const confirmed = view?.status === "PAID";
  const stillChecking = !confirmed && !error && checksDone < MAX_CHECKS;

  return (
    <PayLinkShell>
      <div className="payer-state" role="status" aria-live="polite">
        {confirmed ? (
          <>
            <CheckCircle2 className="payer-state-icon payer-state-icon--success" aria-hidden />
            <h1 className="payer-title">Paiement confirmé</h1>
            <p className="payer-text">
              Merci ! {view ? `${formatPayLinkPeriod(view)} de ${view.tenantFirstName} est réglé.` : ""} La quittance
              est envoyée au locataire.
            </p>
          </>
        ) : (
          <>
            {stillChecking ? (
              <Loader2 className="payer-state-icon payer-spin" aria-hidden />
            ) : (
              <Clock className="payer-state-icon" aria-hidden />
            )}
            <h1 className="payer-title">Merci !</h1>
            <p className="payer-text">
              Votre paiement est en cours de vérification. Dès qu&apos;il est confirmé, la quittance est envoyée au
              locataire.
            </p>
            {!stillChecking && (
              <p className="payer-footnote">
                La confirmation peut prendre jusqu&apos;à 15 minutes. Inutile de payer à nouveau : vous pouvez fermer
                cette page.
              </p>
            )}
            {error && (
              <p className="payer-error" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </PayLinkShell>
  );
}

import type { ReactNode } from "react";
import { PROPERTY_TYPE_LABELS } from "@/lib/dashboard";
import { formatFcfa } from "@/lib/format";
import { formatPayLinkDate, formatPayLinkPeriod, type PayLinkView } from "@/lib/pay-links";

// Cadre commun des pages publiques du lien de paiement (/payer et /merci) :
// hors de l'espace connecté (pas d'AppShell, aucune connexion demandée).
export function PayLinkShell({ children }: { children: ReactNode }) {
  return (
    <main className="payer-page">
      <div className="payer-card">
        <header className="payer-brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo statique local */}
          <img src="/WARAH-logo-transparent.png" alt="WARAH" className="payer-logo" />
        </header>
        {children}
      </div>
      <p className="payer-legal">Paiement sécurisé par PayDunya · WARAH, gestion locative</p>
    </main>
  );
}

// Résumé du loyer : prénom, logement, quartier, période et montants — rien
// de plus (le lien peut avoir été transféré, voir PayLinkView).
export function PayLinkSummary({ view }: { view: PayLinkView }) {
  const propertyLabel = [PROPERTY_TYPE_LABELS[view.propertyType] ?? "Logement", view.building]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-labelledby="payer-summary-title">
      <h1 id="payer-summary-title" className="payer-title">
        Loyer de {view.tenantFirstName}
      </h1>
      <p className="payer-property">{propertyLabel}</p>
      <p className="payer-text">
        {view.neighborhood}, {view.city}
      </p>
      <p className="payer-text">
        {formatPayLinkPeriod(view)} · à payer le {formatPayLinkDate(view.dueDate)}
      </p>

      <dl className="payer-amounts">
        <div className="payer-amount-row">
          <dt>Reste à payer</dt>
          <dd>{formatFcfa(view.rentAmount)}</dd>
        </div>
        <div className="payer-amount-row">
          <dt>Frais de service</dt>
          <dd>{formatFcfa(view.feeAmount)}</dd>
        </div>
        <div className="payer-amount-row payer-amount-row--total">
          <dt>Total</dt>
          <dd>{formatFcfa(view.totalAmount)}</dd>
        </div>
      </dl>
    </section>
  );
}

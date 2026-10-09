import { describe, it, expect } from "vitest";
import { ApiError } from "./api";
import { formatPayLinkPeriod, payLinkErrorMessage } from "./pay-links";

describe("formatPayLinkPeriod", () => {
  it("affiche le mois pour un loyer mensuel", () => {
    expect(
      formatPayLinkPeriod({ periodStart: "2026-10-01T00:00:00.000Z", periodEnd: "2026-10-31T00:00:00.000Z" }),
    ).toBe("Loyer d'octobre 2026");
  });

  it("élide « de » devant un mois commençant par une voyelle", () => {
    expect(
      formatPayLinkPeriod({ periodStart: "2026-08-01T00:00:00.000Z", periodEnd: "2026-08-31T00:00:00.000Z" }),
    ).toBe("Loyer d'août 2026");
    expect(
      formatPayLinkPeriod({ periodStart: "2026-11-01T00:00:00.000Z", periodEnd: "2026-11-30T00:00:00.000Z" }),
    ).toBe("Loyer de novembre 2026");
  });

  it("affiche la période complète pour un loyer trimestriel", () => {
    expect(
      formatPayLinkPeriod({ periodStart: "2026-10-01T00:00:00.000Z", periodEnd: "2026-12-31T00:00:00.000Z" }),
    ).toBe("Loyer du 1 octobre 2026 au 31 décembre 2026");
  });
});

describe("payLinkErrorMessage", () => {
  it("explique une limite de tentatives atteinte", () => {
    expect(payLinkErrorMessage(new ApiError(429, {}))).toBe("Trop de tentatives. Réessayez dans une minute.");
  });

  it("présente un lien inconnu comme non valide", () => {
    expect(payLinkErrorMessage(new ApiError(404, { message: "Lien invalide" }))).toBe(
      "Ce lien de paiement n'est pas valide.",
    );
  });

  it("reprend le message du serveur pour un lien expiré ou un paiement refusé", () => {
    expect(payLinkErrorMessage(new ApiError(400, { message: "Lien expiré, demandez-en un nouveau" }))).toBe(
      "Lien expiré, demandez-en un nouveau",
    );
    expect(payLinkErrorMessage(new ApiError(409, { message: "Un paiement est déjà en cours" }))).toBe(
      "Un paiement est déjà en cours",
    );
  });

  it("garde le message du service de paiement indisponible (503) mais masque les autres erreurs serveur", () => {
    expect(payLinkErrorMessage(new ApiError(503, { message: "PayDunya indisponible" }))).toBe("PayDunya indisponible");
    expect(payLinkErrorMessage(new ApiError(500, { message: "stack interne" }))).toBe(
      "Le service est momentanément indisponible. Réessayez dans quelques instants.",
    );
  });

  it("signale un problème de connexion quand la requête n'a pas abouti", () => {
    expect(payLinkErrorMessage(new TypeError("Failed to fetch"))).toBe(
      "Connexion impossible. Vérifiez votre accès à internet puis réessayez.",
    );
  });
});

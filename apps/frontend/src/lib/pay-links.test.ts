import { describe, it, expect } from "vitest";
import { ApiError } from "./api";
import { PAY_LINK_EXPIRED_MESSAGE, formatPayLinkPeriod, payLinkErrorKind, payLinkErrorMessage } from "./pay-links";

describe("payLinkErrorKind", () => {
  it("classe un 410 comme expiré (futur code serveur)", () => {
    expect(payLinkErrorKind(new ApiError(410, { message: "Lien expiré" }))).toBe("expired");
    expect(payLinkErrorKind(new ApiError(410, null))).toBe("expired");
  });

  it("classe un 400 dont le message parle d'expiration comme expiré (code serveur actuel)", () => {
    expect(payLinkErrorKind(new ApiError(400, { message: "Lien expiré, demandez-en un nouveau" }))).toBe("expired");
    expect(payLinkErrorKind(new ApiError(400, { message: "LIEN EXPIRÉ" }))).toBe("expired");
    expect(payLinkErrorKind(new ApiError(400, { message: "This link has expired" }))).toBe("expired");
  });

  it("classe un lien abîmé ou inconnu comme non valide (aucun Réessayer)", () => {
    expect(payLinkErrorKind(new ApiError(400, { message: "Lien invalide" }))).toBe("invalid");
    expect(payLinkErrorKind(new ApiError(400, null))).toBe("invalid");
    expect(payLinkErrorKind(new ApiError(404, { message: "Lien invalide" }))).toBe("invalid");
    expect(payLinkErrorKind(new ApiError(403, {}))).toBe("invalid");
  });

  it("ne confond pas un message « expir » sur un autre code avec un lien expiré", () => {
    expect(payLinkErrorKind(new ApiError(404, { message: "Lien expiré" }))).toBe("invalid");
    expect(payLinkErrorKind(new ApiError(500, { message: "Session expirée" }))).toBe("retryable");
  });

  it("propose de réessayer pour une coupure réseau, un 408, un 429 ou une erreur serveur", () => {
    expect(payLinkErrorKind(new TypeError("Failed to fetch"))).toBe("retryable");
    expect(payLinkErrorKind(new Error("inconnue"))).toBe("retryable");
    expect(payLinkErrorKind(undefined)).toBe("retryable");
    expect(payLinkErrorKind(new ApiError(408, {}))).toBe("retryable");
    expect(payLinkErrorKind(new ApiError(429, {}))).toBe("retryable");
    expect(payLinkErrorKind(new ApiError(500, {}))).toBe("retryable");
    expect(payLinkErrorKind(new ApiError(502, null))).toBe("retryable");
    expect(payLinkErrorKind(new ApiError(503, { message: "PayDunya indisponible" }))).toBe("retryable");
  });
});

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

  it("remplace le message du serveur pour un lien expiré (pas de « demandez-en un nouveau »)", () => {
    const expected = `Ce lien a expiré. ${PAY_LINK_EXPIRED_MESSAGE}`;
    expect(payLinkErrorMessage(new ApiError(400, { message: "Lien expiré, demandez-en un nouveau" }))).toBe(expected);
    expect(payLinkErrorMessage(new ApiError(410, { message: "Gone" }))).toBe(expected);
  });

  it("reprend le message du serveur pour un paiement refusé", () => {
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

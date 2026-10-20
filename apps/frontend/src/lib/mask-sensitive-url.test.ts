import { describe, it, expect } from "vitest";
import { maskSensitiveUrl, scrubSentryEvent } from "./mask-sensitive-url";

const TOKEN = "eyJwIjoicGF5LWxpbmsifQ.c2lnbmF0dXJl";

describe("maskSensitiveUrl", () => {
  it("masque le jeton des pages /payer et des appels /pay-links", () => {
    expect(maskSensitiveUrl(`https://warahcontact.com/payer/${TOKEN}/merci`)).toBe(
      "https://warahcontact.com/payer/[jeton]/merci",
    );
    expect(maskSensitiveUrl(`/api/pay-links/${TOKEN}/initiate`)).toBe("/api/pay-links/[jeton]/initiate");
  });

  it("masque un jeton d'invitation passé en paramètre", () => {
    expect(maskSensitiveUrl(`/auth/activate?token=${TOKEN}`)).toBe("/auth/activate?token=[masqué]");
  });

  it("laisse intactes les autres URL", () => {
    expect(maskSensitiveUrl("/locataire/paiements")).toBe("/locataire/paiements");
  });
});

describe("scrubSentryEvent", () => {
  it("ne laisse le jeton nulle part dans l'événement", () => {
    const event = scrubSentryEvent({
      request: { url: `https://warahcontact.com/payer/${TOKEN}` },
      transaction: `/payer/${TOKEN}`,
      breadcrumbs: [{ data: { from: `/payer/${TOKEN}`, to: `/payer/${TOKEN}/merci`, url: `/api/pay-links/${TOKEN}` } }],
    });
    expect(JSON.stringify(event)).not.toContain(TOKEN);
  });
});

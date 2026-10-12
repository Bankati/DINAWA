import { describe, it, expect } from "vitest";
import { maskAnalyticsUrl } from "./analytics-url";

describe("maskAnalyticsUrl", () => {
  it("masque le jeton du lien de paiement", () => {
    expect(maskAnalyticsUrl("https://www.warahcontact.com/payer/eyJlIjoiYWJjIn0.sig")).toBe(
      "https://www.warahcontact.com/payer/[jeton]",
    );
    expect(maskAnalyticsUrl("https://www.warahcontact.com/payer/eyJlIjoiYWJjIn0.sig/merci")).toBe(
      "https://www.warahcontact.com/payer/[jeton]/merci",
    );
  });

  it("retire le jeton d'invitation locataire et les autres paramètres", () => {
    expect(maskAnalyticsUrl("https://www.warahcontact.com/auth/activate?token=secret123")).toBe(
      "https://www.warahcontact.com/auth/activate",
    );
    expect(maskAnalyticsUrl("https://www.warahcontact.com/auth/login?returnUrl=%2Fproprietaire")).toBe(
      "https://www.warahcontact.com/auth/login",
    );
  });

  it("garde la provenance marketing (utm_*)", () => {
    expect(
      maskAnalyticsUrl("https://www.warahcontact.com/?utm_source=tiktok&token=x&utm_campaign=lancement"),
    ).toBe("https://www.warahcontact.com/?utm_source=tiktok&utm_campaign=lancement");
  });

  it("retire le fragment et laisse les autres pages intactes", () => {
    expect(maskAnalyticsUrl("https://www.warahcontact.com/annonces/villa-be#photos")).toBe(
      "https://www.warahcontact.com/annonces/villa-be",
    );
  });

  it("annule l'envoi si l'adresse est illisible", () => {
    expect(maskAnalyticsUrl("pas une adresse")).toBeNull();
  });
});

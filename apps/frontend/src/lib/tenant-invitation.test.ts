import { describe, it, expect } from "vitest";
import {
  formatWhatsappNumber,
  tenantInvitationMessage,
  tenantInvitationWhatsappLink,
  whatsappBotLink,
} from "./tenant-invitation";

const URL_ACTIVATION = "https://warah.tg/auth/activate?token=abc";
const MESSAGE_ACTUEL = `Bonjour Ama, voici votre lien pour activer votre compte locataire WARAH : ${URL_ACTIVATION}`;

describe("formatWhatsappNumber", () => {
  it("affiche un numéro togolais par paires", () => {
    expect(formatWhatsappNumber("22899327312")).toBe("+228 99 32 73 12");
  });

  it("laisse un numéro hors Togo en « +chiffres »", () => {
    expect(formatWhatsappNumber("15551234567")).toBe("+15551234567");
  });
});

describe("whatsappBotLink", () => {
  it("construit le lien wa.me du robot", () => {
    expect(whatsappBotLink("22899327312")).toBe("https://wa.me/22899327312");
  });
});

describe("tenantInvitationMessage", () => {
  it("reste exactement le message actuel sans numéro du robot", () => {
    expect(tenantInvitationMessage("Ama", URL_ACTIVATION, null)).toBe(MESSAGE_ACTUEL);
    expect(tenantInvitationMessage("Ama", URL_ACTIVATION, "")).toBe(MESSAGE_ACTUEL);
  });

  it("ajoute le numéro lisible et le lien du robot quand il est fourni", () => {
    expect(tenantInvitationMessage("Ama", URL_ACTIVATION, "22899327312")).toBe(
      `${MESSAGE_ACTUEL}\n\n` +
        "Enregistrez aussi le numéro WhatsApp de WARAH : +228 99 32 73 12. " +
        "Écrivez-lui pour activer votre assistant WhatsApp (payer votre loyer, recevoir vos quittances) : " +
        "https://wa.me/22899327312",
    );
  });
});

describe("tenantInvitationWhatsappLink", () => {
  it("vise le téléphone du locataire (8 chiffres → 228) avec le message encodé", () => {
    const link = tenantInvitationWhatsappLink({
      phone: "90 33 05 57",
      firstName: "Ama",
      invitationUrl: URL_ACTIVATION,
      whatsappBotNumber: "22899327312",
    });
    const url = new URL(link);
    expect(url.origin + url.pathname).toBe("https://wa.me/22890330557");
    expect(url.searchParams.get("text")).toBe(tenantInvitationMessage("Ama", URL_ACTIVATION, "22899327312"));
  });

  it("garde un numéro déjà international tel quel", () => {
    const link = tenantInvitationWhatsappLink({
      phone: "+22890330557",
      firstName: "Ama",
      invitationUrl: URL_ACTIVATION,
      whatsappBotNumber: null,
    });
    expect(link).toBe(`https://wa.me/22890330557?text=${encodeURIComponent(MESSAGE_ACTUEL)}`);
  });
});

// Message d'invitation envoyé par le propriétaire / gestionnaire depuis son
// propre WhatsApp (pages « Locataires » propriétaire et gestionnaire). Le
// numéro du robot vient uniquement de la réponse du backend
// (`whatsappBotNumber`, null si WhatsApp est éteint) — jamais codé ici.

const TOGO_INTERNATIONAL = /^228(\d{8})$/;

// « 22899327312 » → « +228 99 32 73 12 ». Un numéro hors Togo (ex. numéro de
// test Meta) reste « +chiffres ».
export function formatWhatsappNumber(international: string): string {
  const digits = international.replace(/\D/g, '');
  const togo = TOGO_INTERNATIONAL.exec(digits);
  if (!togo) return `+${digits}`;
  return `+228 ${(togo[1].match(/\d{2}/g) ?? []).join(' ')}`;
}

export function whatsappBotLink(whatsappBotNumber: string): string {
  return `https://wa.me/${whatsappBotNumber.replace(/\D/g, '')}`;
}

export function tenantInvitationMessage(
  firstName: string,
  invitationUrl: string,
  whatsappBotNumber: string | null,
): string {
  const message = `Bonjour ${firstName}, voici votre lien pour activer votre compte locataire WARAH : ${invitationUrl}`;
  if (!whatsappBotNumber?.replace(/\D/g, '')) return message;
  return (
    `${message}\n\n` +
    `Enregistrez aussi le numéro WhatsApp de WARAH : ${formatWhatsappNumber(whatsappBotNumber)}. ` +
    `Écrivez-lui pour activer votre assistant WhatsApp (payer votre loyer, recevoir vos quittances) : ` +
    whatsappBotLink(whatsappBotNumber)
  );
}

// Même formule que la page publique d'annonce (annonces/[slug]/page.tsx) —
// numéro togolais à 8 chiffres préfixé 228, sinon laissé tel quel.
export function tenantInvitationWhatsappLink(invite: {
  phone: string;
  firstName: string;
  invitationUrl: string;
  whatsappBotNumber: string | null;
}): string {
  const digits = invite.phone.replace(/\D/g, '');
  const international = digits.length === 8 ? `228${digits}` : digits;
  const message = tenantInvitationMessage(invite.firstName, invite.invitationUrl, invite.whatsappBotNumber);
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

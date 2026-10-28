import { normalizeTogoPhone } from './normalize-togo-phone';

const TOGO_LOCAL_PHONE = /^\d{8}$/;
const TOGO_COUNTRY_CODE = '228';

// Format exigé par l'API WhatsApp Cloud de Meta : international, sans `+`
// (228XXXXXXXX). Jamais stocké en base — WARAH ne garde que les 8 chiffres
// (voir User.phone / User.whatsappPhone), ce format est fabriqué au dernier
// moment, juste avant l'appel à Meta. Renvoie null plutôt que de lever : un
// numéro inexploitable n'est pas une erreur de la requête en cours, l'envoi
// WhatsApp est simplement impossible (l'email/push part quand même).
export function toWhatsappNumber(phone: string | null | undefined): string | null {
  const local = normalizeTogoPhone(phone ?? undefined);
  if (typeof local !== 'string' || !TOGO_LOCAL_PHONE.test(local)) return null;
  return `${TOGO_COUNTRY_CODE}${local}`;
}

// Formes sous lesquelles un même numéro togolais peut être enregistré en
// base : les formulaires acceptent `^\+?\d{8,15}$` et stockent la saisie
// telle quelle (constaté sur la base de dev : 8 numéros sur 11 hors format
// à 8 chiffres, /review unité 44). Toute recherche d'utilisateur par numéro
// doit donc essayer chacune — sinon un STOP serait ignoré alors que l'envoi,
// qui normalise via toWhatsappNumber, continuerait d'atteindre la personne.
export function storedPhoneVariants(local: string): string[] {
  return [local, `${TOGO_COUNTRY_CODE}${local}`, `+${TOGO_COUNTRY_CODE}${local}`, `00${TOGO_COUNTRY_CODE}${local}`];
}

// Inverse de toWhatsappNumber pour un expéditeur reçu par le webhook (unité
// 44) : `22898646779` → { local: '98646779' }. Un numéro hors Togo n'a pas
// de forme locale WARAH : il est gardé tel quel (chiffres seuls) et ne peut
// correspondre à aucun compte.
export function fromWhatsappNumber(metaNumber: string): { local: string | null; digits: string } {
  const digits = metaNumber.replace(/\D/g, '');
  const local =
    digits.length === TOGO_COUNTRY_CODE.length + 8 && digits.startsWith(TOGO_COUNTRY_CODE)
      ? digits.slice(TOGO_COUNTRY_CODE.length)
      : null;
  return { local, digits };
}

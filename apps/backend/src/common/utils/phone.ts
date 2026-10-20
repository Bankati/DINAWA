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

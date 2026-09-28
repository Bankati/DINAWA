// Ramène un numéro saisi librement ("+228 90 33 05 57", "00228-90330557",
// "90330557") à sa forme locale à 8 chiffres, seule acceptée par PayDunya
// comme `account_alias` (numéro sans indicatif pays). Ne valide rien : laisse
// tel quel (nettoyé) ce qui n'a pas la forme d'un numéro togolais, pour que
// la validation du DTO le rejette avec un message clair.
export function normalizeTogoPhone(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  const digits = raw.replace(/[\s.\-()]/g, '');
  const withoutPlus = digits.startsWith('+') ? digits.slice(1) : digits;
  const withoutIntl = withoutPlus.startsWith('00') ? withoutPlus.slice(2) : withoutPlus;
  return withoutIntl.startsWith('228') && withoutIntl.length === 11
    ? withoutIntl.slice(3)
    : withoutIntl;
}

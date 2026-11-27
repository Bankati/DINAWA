// Petites règles d'affichage et de normalisation partagées par les artisans
// et les pannes. Fonctions pures, testées dans artisan-utils.spec.ts.

// Quartiers saisis librement : même forme en base et dans les filtres
// (« tokoin  » et « Tokoin » donnent « Tokoin »), pour que le filtre exact
// de l'annuaire retrouve les fiches.
export function normalizeZone(raw: string): string {
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  return collapsed.charAt(0).toLocaleUpperCase('fr-FR') + collapsed.slice(1);
}

export function normalizeZones(zones: string[] | undefined): string[] {
  if (!zones) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const zone of zones) {
    const normalized = normalizeZone(zone);
    const key = normalized.toLocaleLowerCase('fr-FR');
    if (normalized && !seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }
  return result;
}

// « 90 •• •• 56 » : assez pour que l'artisan reconnaisse son numéro, pas
// assez pour le recopier depuis un lien transféré.
export function maskPhone(phone: string): string {
  if (phone.length !== 8) return '•• •• •• ••';
  return `${phone.slice(0, 2)} •• •• ${phone.slice(6)}`;
}

// Jamais le nom de famille complet d'un auteur d'avis sur une page publique
// (même règle que les avis des gestionnaires).
export function shortName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName.charAt(0)}.`.trim();
}

// Lisible au téléphone : sans 0/O ni 1/I.
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function supportReference(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += REFERENCE_ALPHABET[Math.floor(random() * REFERENCE_ALPHABET.length)];
  }
  return `SR-${code}`;
}

// Adresse envoyée à l'outil de statistiques de visites (Vercel Web Analytics).
// Les statistiques n'ont besoin que de la page visitée et de la provenance
// marketing : on ne transmet jamais un jeton à un service tiers.
// - `/payer/<jeton>` (lien de paiement) devient `/payer/[jeton]` ;
// - seuls les paramètres `utm_*` sont conservés (provenance TikTok, Facebook…),
//   tous les autres sont retirés (ex. `?token=` de l'invitation locataire) ;
// - le fragment `#…` est retiré.
// Renvoie null si l'adresse est illisible : la visite n'est alors pas envoyée.
const PAY_LINK_PATH = /^\/payer\/[^/]+/;

export function maskAnalyticsUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const kept = new URLSearchParams();
  parsed.searchParams.forEach((value, key) => {
    if (key.toLowerCase().startsWith('utm_')) kept.append(key, value);
  });
  const query = kept.toString();
  const path = parsed.pathname.replace(PAY_LINK_PATH, '/payer/[jeton]');

  return `${parsed.origin}${path}${query ? `?${query}` : ''}`;
}

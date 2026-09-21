const DEFAULT_ORIGINS = ['http://localhost:4300'];

// Le navigateur envoie l'en-tête Origin sans espace ni "/" final : une entrée
// collée avec l'un des deux dans la variable Railway ne matcherait jamais et
// bloquerait silencieusement le site concerné (incident 2026-09-21).
export function parseAllowedOrigins(raw: string | undefined): string[] {
  const origins = (raw ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => origin.length > 0);

  return origins.length > 0 ? origins : DEFAULT_ORIGINS;
}

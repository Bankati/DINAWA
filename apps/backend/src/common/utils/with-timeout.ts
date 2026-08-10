export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Opération expirée après ${timeoutMs} ms`);
    this.name = 'TimeoutError';
  }
}

// Borne la durée d'un appel sortant (voir code-standards.md, "Timeouts et
// retry sur les appels externes" — 10s par défaut). Rejette avec
// TimeoutError sans attendre la promesse d'origine, qui continue de
// s'exécuter en arrière-plan et sera ignorée (comportement accepté pour un
// appel déjà jugé bloqué au-delà du budget).
export async function withTimeout<T>(promise: Promise<T>, timeoutMs = 10_000): Promise<T> {
  let timer!: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(timeoutMs)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

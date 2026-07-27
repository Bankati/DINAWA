import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

type SupabaseClient = ReturnType<typeof createClient>;

// Défaut aligné sur EmailService/WebPushService (mêmes valeurs pRetry) —
// absorbe un blip réseau ponctuel vers l'infrastructure Supabase (voir
// incident constaté en test : ConnectTimeoutError sur generateLink() et
// transaction Postgres pendant un réveil de projet gratuit). N'aide pas
// contre une panne prolongée, seulement contre les échecs transitoires.
const DEFAULT_RETRY_OPTIONS = { retries: 3, minTimeout: 1000, maxTimeout: 16000 };

@Injectable()
export class SupabaseAdminService {
  private readonly logger = new Logger(SupabaseAdminService.name);

  private readonly client: SupabaseClient;
  // Client anon dédié à signInWithPassword() (AuthService.login) — le
  // principe de moindre privilège veut qu'on ne fasse jamais transiter une
  // connexion utilisateur par la clé service_role.
  private readonly anonClient: SupabaseClient;

  constructor(config: ConfigService) {
    this.client = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    this.anonClient = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_ANON_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }

  get auth(): SupabaseClient['auth'] {
    return this.client.auth;
  }

  // Utilisé uniquement pour signInWithPassword() côté serveur (voir
  // AuthService.login) — jamais pour des opérations admin.
  get anonAuth(): SupabaseClient['auth'] {
    return this.anonClient.auth;
  }

  // Accès complet au client — utilisé par StorageService pour l'API Storage
  get raw(): SupabaseClient {
    return this.client;
  }

  // Seul point d'entrée pour retenter un appel vers l'API Supabase (Auth
  // admin, getUser, signInWithPassword...) — jamais de pRetry ad hoc dans un
  // service métier. Ne retente que sur exception levée (échec réseau bas
  // niveau : timeout, connexion refusée) — une erreur métier retournée par
  // le SDK (ex. `{ error: { code: 'email_exists' } }`, jamais levée en
  // exception) traverse normalement dès le premier essai, aucun retry inutile.
  async withRetry<T>(
    fn: () => Promise<T>,
    options: { retries?: number; minTimeout?: number; maxTimeout?: number } = {},
  ): Promise<T> {
    const { default: pRetry } = await import('p-retry');
    return pRetry(fn, {
      ...DEFAULT_RETRY_OPTIONS,
      ...options,
      onFailedAttempt: (error) => {
        this.logger.warn(
          `[supabase-admin] tentative ${error.attemptNumber} échouée, ${error.retriesLeft} restante(s) — ${error.message}`,
        );
      },
    });
  }
}

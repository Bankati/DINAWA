import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

type SupabaseClient = ReturnType<typeof createClient>;

@Injectable()
export class SupabaseAdminService {
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
}

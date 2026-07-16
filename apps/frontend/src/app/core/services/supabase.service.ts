import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, Session, AuthError } from '@supabase/supabase-js';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
    { auth: { persistSession: true, autoRefreshToken: true } }
  );

  get auth() { return this.client.auth; }

  getSession(): Promise<{ data: { session: Session | null }; error: AuthError | null }> {
    return this.client.auth.getSession();
  }
}

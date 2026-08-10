import { Injectable } from '@nestjs/common';

// Remplace SupabaseAdminService dans les tests e2e (voir mandates.e2e-spec.ts)
// — la seule dépendance externe réelle de SupabaseAuthGuard. Contrairement à
// une première tentative avec overrideGuard() (qui ne fonctionne pas pour un
// guard enregistré uniquement via APP_GUARD, jamais exposé comme provider
// nommé — voir @nestjs/core/injector/module.js, replace() ne cherche que
// dans _injectables, jamais peuplé pour les APP_GUARD), cette approche
// override un provider normal et laisse tourner le VRAI SupabaseAuthGuard
// (cache, vérification email confirmé, comptes suspendus...) — plus de
// couverture réelle, pas moins.
//
// Convention : le "token" Bearer envoyé par le test EST le `supabaseId` de
// l'utilisateur Prisma seedé (voir mandates.e2e-spec.ts) — getUser() le
// renvoie tel quel comme id Supabase, avec un email confirmé.
@Injectable()
export class FakeSupabaseAdminService {
  async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }

  get auth() {
    return {
      getUser: async (token: string) => ({
        data: { user: { id: token, email_confirmed_at: new Date().toISOString() } },
        error: null,
      }),
    };
  }
}

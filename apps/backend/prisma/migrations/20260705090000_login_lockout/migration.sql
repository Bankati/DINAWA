-- Blocage temporaire après 5 échecs de connexion consécutifs (voir
-- build-plan.md unité 10, AuthService.login()). Colonnes nullable/avec
-- défaut — rétrocompatible.
ALTER TABLE "users"
  ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedUntil" TIMESTAMPTZ(6);

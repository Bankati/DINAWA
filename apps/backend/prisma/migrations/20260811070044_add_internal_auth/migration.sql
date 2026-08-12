/*
  Warnings:

  - Added the required column `passwordHash` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Comptes existants (44 lignes, authentification Supabase Auth retirée le
-- 2026-08-11) : hash bcrypt réel mais d'un secret aléatoire jamais connu de
-- personne — aucun mot de passe ne pourra jamais correspondre. Ces comptes
-- redéfinissent leur mot de passe via "mot de passe oublié" (OTP, déjà
-- fonctionnel) au premier login après la bascule.
ALTER TABLE "users" ADD COLUMN     "passwordHash" TEXT NOT NULL DEFAULT '$2b$12$yCFsKe6MMnIIPVrHHkt8v.T8gJ2UapzKcX4ejzcEv3kq0gwXAlrte';
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP DEFAULT;

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshTokenHash_key" ON "sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

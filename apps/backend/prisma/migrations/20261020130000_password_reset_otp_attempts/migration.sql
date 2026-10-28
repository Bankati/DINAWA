-- Audit de sécurité du 2026-10-20 (E1) : compteur d'essais sur les codes de
-- réinitialisation du mot de passe. Ajout seul, valeur par défaut 0 : aucun
-- impact sur les codes existants.
ALTER TABLE "password_reset_otps" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

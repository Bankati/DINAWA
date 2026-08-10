-- Anti-doublon pour les rappels d'inactivité (voir build-plan.md unité 11,
-- InactivityTask). Remis à NULL dès que le compte redevient actif — voir
-- AccountActivationService.reactivateIfEligible().
ALTER TABLE "users"
  ADD COLUMN "inactivityWarning30SentAt" TIMESTAMPTZ(6),
  ADD COLUMN "inactivityWarning7SentAt" TIMESTAMPTZ(6),
  ADD COLUMN "inactivityWarning1SentAt" TIMESTAMPTZ(6);

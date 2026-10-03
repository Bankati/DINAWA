import { describe, it, expect } from "vitest";
import { ACTION_LABELS } from "./audit-log-labels";

// LIMITE CONNUE (voir /review, 2026-10-03) : ce test vérifie uniquement que
// chaque clé de ACTION_LABELS est bien formée (méthode HTTP valide + préfixe
// "/api/"). Il NE GARANTIT PAS que la route existe réellement côté backend,
// ni qu'elle n'a pas été renommée depuis — une dépendance directe de ce
// paquet frontend vers le code backend n'est pas souhaitable (CI exécute
// backend-ci et frontend-ci comme deux jobs indépendants, sans état
// partagé). La référence à jour des routes mutantes réelles est le test
// `apps/backend/src/common/interceptors/audit-log-routes.spec.ts` (liste
// par réflexion sur les décorateurs Nest, jamais retranscrite à la main) :
// à consulter manuellement quand on ajoute/modifie une entrée ici.

const VALID_KEY = /^(GET|POST|PUT|PATCH|DELETE) \/api\/.+$/;

describe("ACTION_LABELS (audit-log-labels)", () => {
  const keys = Object.keys(ACTION_LABELS);

  it("contient au moins une entrée", () => {
    expect(keys.length).toBeGreaterThan(0);
  });

  it.each(keys)(
    "la clé %p est bien formée (méthode HTTP + /api/...)",
    (key) => {
      expect(key).toMatch(VALID_KEY);
    },
  );

  it("n'a pas de route en double sous une casse différente", () => {
    const normalized = keys.map((k) => k.toLowerCase());
    expect(new Set(normalized).size).toBe(normalized.length);
  });

  it("chaque entrée a un verbe non vide et un ton valide", () => {
    const validTones = [
      "critical",
      "warning",
      "success",
      "info",
      "routine",
      "system",
    ];
    for (const key of keys) {
      const label = ACTION_LABELS[key];
      expect(label.verb.trim().length).toBeGreaterThan(0);
      expect(validTones).toContain(label.tone);
    }
  });
});

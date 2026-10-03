import type { AdminAuditLogEntry } from "./admin";

// Traduit le journal d'audit technique (route HTTP brute, metadata JSON) en
// phrases compréhensibles par un super-admin non technique — voir
// /architect journal d'audit, 2026-10-02 (déclenché par un propriétaire
// n'ayant trouvé aucune information exploitable après qu'un compte a été
// supprimé par erreur). Dictionnaire par route exacte plutôt qu'une règle
// générique : une même route (ex. "suspend") n'a pas le même sens qu'une
// règle method+entité déduirait automatiquement.

export type AuditTone =
  "critical" | "warning" | "success" | "info" | "routine" | "system";

export const TONE_LABEL: Record<AuditTone, string> = {
  critical: "Sensible",
  warning: "À surveiller",
  success: "Normal",
  info: "Normal",
  routine: "Routine",
  system: "Automatique",
};

// Libellés FR de la catégorie (entityType brut renvoyé par le backend —
// premier segment d'URL, voir AuditLogInterceptor.deriveEntityType) — sert
// au filtre, pas à la phrase elle-même (plus précise, voir ACTION_LABELS).
export const CATEGORY_LABELS: Record<string, string> = {
  admin: "Administration",
  auth: "Authentification",
  contact: "Contact",
  leases: "Baux",
  managers: "Avis gestionnaires",
  mandates: "Mandats",
  notifications: "Notifications",
  "payment-declarations": "Déclarations de paiement",
  payments: "Paiements",
  payouts: "Reversements",
  profile: "Profil",
  properties: "Biens",
  push: "Notifications push",
  subscription: "Abonnements",
};

function meta(entry: AdminAuditLogEntry, key: string): string | null {
  const value = entry.metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function personName(entry: AdminAuditLogEntry): string | null {
  const first = meta(entry, "firstName");
  const last = meta(entry, "lastName");
  if (first || last) return [first, last].filter(Boolean).join(" ");
  return null;
}

type ActionLabel = {
  verb: string;
  tone: AuditTone;
  detail?: (entry: AdminAuditLogEntry) => string | null;
};

const SETTINGS_FIELD_LABELS: Record<string, string> = {
  subscriptionQuotasSuspended: "Suspension des quotas de biens",
  subscriptionBillingEnabled: "Facturation des abonnements",
};

// Exporté uniquement pour audit-log-labels.spec.ts (validation de format) —
// pas d'autre consommateur hors de ce fichier.
export const ACTION_LABELS: Record<string, ActionLabel> = {
  "POST /api/admin/users/:id/suspend": {
    verb: "a suspendu un compte utilisateur",
    tone: "warning",
    detail: (e) => {
      const r = meta(e, "reason");
      return r ? `Motif : ${r}` : null;
    },
  },
  "POST /api/admin/users/:id/reactivate": {
    verb: "a réactivé un compte utilisateur",
    tone: "success",
  },
  "DELETE /api/admin/users/:id": {
    verb: "a supprimé un compte utilisateur",
    tone: "critical",
    detail: (e) => {
      const r = meta(e, "reason");
      return r ? `Motif : ${r}` : "Aucun motif renseigné.";
    },
  },
  "PATCH /api/admin/reviews/:id/moderate": {
    verb: "a modéré un avis laissé sur un gestionnaire",
    tone: "warning",
    detail: (e) =>
      e.metadata?.["isHidden"] === true
        ? "Avis masqué du public."
        : "Avis réaffiché au public.",
  },
  "PATCH /api/admin/settings": {
    verb: "a modifié les réglages de la plateforme",
    tone: "warning",
    detail: (e) => {
      if (!e.metadata) return null;
      const changes = Object.entries(e.metadata)
        .filter(([k]) => k in SETTINGS_FIELD_LABELS)
        .map(
          ([k, v]) =>
            `${SETTINGS_FIELD_LABELS[k]} → ${v ? "activé" : "désactivé"}`,
        );
      return changes.length ? changes.join(" · ") : null;
    },
  },
  "POST /api/auth/signup/owner": {
    verb: "a créé un compte propriétaire",
    tone: "success",
    detail: (e) => meta(e, "email"),
  },
  "POST /api/auth/signup/manager": {
    verb: "a créé un compte gestionnaire",
    tone: "success",
    detail: (e) => meta(e, "email"),
  },
  "POST /api/auth/invite/tenant": {
    verb: "a invité un locataire",
    tone: "info",
    detail: (e) => {
      const name = personName(e);
      const email = meta(e, "email");
      return [name, email].filter(Boolean).join(" — ") || null;
    },
  },
  "POST /api/auth/signup/tenant": {
    verb: "a activé son compte locataire (invitation)",
    tone: "success",
  },
  "POST /api/auth/login": { verb: "s'est connecté", tone: "routine" },
  "POST /api/auth/refresh": {
    verb: "a renouvelé sa session (automatique)",
    tone: "routine",
  },
  "POST /api/auth/password-reset/request": {
    verb: "a demandé une réinitialisation de mot de passe",
    tone: "info",
    detail: (e) => meta(e, "email"),
  },
  "POST /api/auth/password-reset/confirm": {
    verb: "a réinitialisé son mot de passe",
    tone: "warning",
    detail: (e) => meta(e, "email"),
  },
  "POST /api/contact": {
    verb: "a envoyé un message via le formulaire de contact public",
    tone: "info",
  },
  "POST /api/leases/:id/terminate": {
    verb: "a résilié un bail",
    tone: "warning",
  },
  "POST /api/managers/:id/reviews": {
    verb: "a laissé un avis sur un gestionnaire",
    tone: "info",
  },
  "PATCH /api/managers/:id/reviews/:reviewId": {
    verb: "a modifié son avis sur un gestionnaire",
    tone: "info",
  },
  "POST /api/mandates": {
    verb: "a proposé un mandat de gestion",
    tone: "info",
  },
  "POST /api/mandates/:id/accept": {
    verb: "a accepté un mandat de gestion",
    tone: "success",
  },
  "POST /api/mandates/:id/revoke": {
    verb: "a révoqué un mandat de gestion",
    tone: "warning",
  },
  "PATCH /api/notifications/:id/read": {
    verb: "a marqué une notification comme lue",
    tone: "routine",
  },
  "PATCH /api/notifications/read-all": {
    verb: "a marqué toutes ses notifications comme lues",
    tone: "routine",
  },
  "POST /api/payment-declarations": {
    verb: "a déclaré un paiement de loyer",
    tone: "info",
  },
  "PATCH /api/payment-declarations/:id": {
    verb: "a modifié une déclaration de paiement",
    tone: "info",
  },
  "DELETE /api/payment-declarations/:id": {
    verb: "a annulé une déclaration de paiement",
    tone: "warning",
  },
  "POST /api/payments/webhooks/paydunya": {
    verb: "a confirmé un paiement (PayDunya)",
    tone: "system",
  },
  "POST /api/payments/manual": {
    verb: "a enregistré un paiement manuel",
    tone: "success",
  },
  "POST /api/payments/initiate": {
    verb: "a initié un paiement en ligne",
    tone: "info",
  },
  "POST /api/payments/:id/confirm": {
    verb: "a confirmé un paiement déclaré",
    tone: "success",
  },
  "POST /api/payments/:id/reject": {
    verb: "a rejeté une déclaration de paiement",
    tone: "warning",
    detail: (e) => {
      const r = meta(e, "rejectionReason");
      return r ? `Motif : ${r}` : null;
    },
  },
  "POST /api/payouts/webhooks/paydunya": {
    verb: "a confirmé un reversement (PayDunya)",
    tone: "system",
  },
  "POST /api/admin/payouts/:id/retry": {
    verb: "a relancé un reversement en échec",
    tone: "warning",
  },
  "PATCH /api/profile": { verb: "a modifié son profil", tone: "routine" },
  "PATCH /api/profile/notification-consent": {
    verb: "a modifié ses préférences de notification",
    tone: "routine",
  },
  "PATCH /api/profile/password": {
    verb: "a changé son mot de passe",
    tone: "warning",
  },
  "DELETE /api/profile": {
    verb: "a supprimé son propre compte",
    tone: "critical",
  },
  "POST /api/properties": { verb: "a créé un bien", tone: "success" },
  "PATCH /api/properties/:id": { verb: "a modifié un bien", tone: "info" },
  "DELETE /api/properties/:id": { verb: "a archivé un bien", tone: "warning" },
  "POST /api/properties/:id/photos": {
    verb: "a ajouté des photos à un bien",
    tone: "info",
  },
  "DELETE /api/properties/:id/photos/:photoId": {
    verb: "a supprimé une photo de bien",
    tone: "info",
  },
  "POST /api/properties/:id/documents": {
    verb: "a ajouté un document à un bien",
    tone: "info",
  },
  "DELETE /api/properties/:id/documents/:documentId": {
    verb: "a supprimé un document de bien",
    tone: "info",
  },
  "POST /api/push/subscribe": {
    verb: "a activé les notifications push",
    tone: "routine",
  },
  "POST /api/push/unsubscribe": {
    verb: "a désactivé les notifications push",
    tone: "routine",
  },
  "POST /api/subscription/upgrade": {
    verb: "a changé de forfait d'abonnement",
    tone: "info",
  },
  "POST /api/subscription/cancel": {
    verb: "a demandé la résiliation de son abonnement",
    tone: "warning",
  },
  "POST /api/subscription/invoices/pay": {
    verb: "a initié le paiement d'une facture d'abonnement",
    tone: "info",
  },
  "POST /api/properties/:propertyId/tenants/:tenantUserId/block": {
    verb: "a bloqué un locataire sur un bien",
    tone: "warning",
    detail: (e) => {
      const r = meta(e, "reason");
      return r ? `Motif : ${r}` : null;
    },
  },
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Propriétaire",
  TENANT: "Locataire",
  MANAGER: "Gestionnaire",
  ADMIN: "Administrateur",
};

export function actorLabel(entry: AdminAuditLogEntry): string {
  if (entry.actor) {
    const role = ROLE_LABEL[entry.actor.role] ?? entry.actor.role;
    return `${entry.actor.firstName} ${entry.actor.lastName} (${role})`;
  }
  if (entry.action.includes("/webhooks/")) return "PayDunya";
  const email = meta(entry, "email");
  if (email) return email;
  return "Visiteur non identifié";
}

export function entityCategoryLabel(entry: AdminAuditLogEntry): string {
  if (!entry.entityType) return "Autre";
  return CATEGORY_LABELS[entry.entityType] ?? entry.entityType;
}

export function describeAuditLog(entry: AdminAuditLogEntry): {
  sentence: string;
  detail: string | null;
  tone: AuditTone;
} {
  // `entry.action` est déjà le gabarit de route tel que stocké par
  // AuditLogInterceptor (ex. "DELETE /api/admin/users/:id", jamais l'id
  // réel interpolé) — correspond directement aux clés du dictionnaire.
  const label = ACTION_LABELS[entry.action];

  if (!label) {
    // Filet de sécurité pour toute route non répertoriée (nouvelle
    // fonctionnalité ajoutée après ce dictionnaire) — jamais un écran
    // vide, toujours une phrase lisible même imparfaite.
    const [method] = entry.action.split(" ");
    const genericVerb =
      method === "DELETE"
        ? "a supprimé un élément"
        : method === "POST"
          ? "a créé un élément"
          : "a modifié un élément";
    return {
      sentence: `${actorLabel(entry)} ${genericVerb} (${entityCategoryLabel(entry)}).`,
      detail: null,
      tone: "info",
    };
  }

  return {
    sentence: `${actorLabel(entry)} ${label.verb}.`,
    detail: label.detail?.(entry) ?? null,
    tone: label.tone,
  };
}

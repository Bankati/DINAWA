import { api } from "./api";

export type NotificationChannel = "PUSH" | "EMAIL";
export type NotificationDispatchStatus = "SENT" | "FAILED";

// Libellés alignés sur EVENT_LABELS côté backend (notify.controller.ts) —
// tout event absent de cette liste retombe sur son nom brut.
export const EVENT_LABELS: Record<string, string> = {
  receipt: "Quittance disponible",
  "payment-reminder": "Rappel de loyer",
  "overdue-alert": "Loyer impayé",
  "payment-declaration-pending": "Paiement à confirmer",
  "payment-rejected": "Déclaration rejetée",
  "monthly-report": "Rapport mensuel disponible",
  "inactivity-warning": "Compte bientôt suspendu",
  "account-suspended": "Compte suspendu",
  "account-reactivated": "Compte réactivé",
  "tenant-invitation": "Invitation envoyée",
  "lease-created": "Nouveau bail",
};

// Sous-ensemble d'events liés aux échéances/rappels de paiement — utilisé
// pour la vue "Rappels" (dashboard/paiements/rappels).
export const REMINDER_EVENTS = [
  "payment-reminder",
  "overdue-alert",
  "payment-declaration-pending",
];

// Correspond à NotificationSummary (GET /notifications)
export interface NotificationSummary {
  id: string;
  event: string;
  titre: string;
  channel: NotificationChannel;
  status: NotificationDispatchStatus;
  payload: unknown;
  createdAt: string;
}

export const notificationsApi = {
  // Pas de "lu/non lu" persistant côté backend — unreadCount est une
  // fenêtre glissante de 24h, pas un flag par notification.
  list: (limit = 50) =>
    api.get<NotificationSummary[]>(`/notifications?limit=${limit}`),

  getUnreadCount: () =>
    api.get<{ count: number }>("/notifications/unread-count"),
};

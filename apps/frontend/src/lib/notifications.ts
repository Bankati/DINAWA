import type { LucideIcon } from "lucide-react";
import {
  Receipt,
  Bell,
  AlertTriangle,
  Clock,
  XCircle,
  FileBarChart2,
  AlertCircle,
  Ban,
  CheckCircle2,
  UserPlus,
  FileSignature,
  Handshake,
} from "lucide-react";

// Un seul point de vérité, importé par les 3 pages "Notifications"
// (dashboard/gestionnaire/locataire) et par le popover de la navbar —
// bug corrigé le 2026-08-11 : chaque page avait sa propre table en emoji
// avec des clés snake_case ('payment_received'...) qui ne correspondaient
// JAMAIS aux vraies valeurs de NotificationEvent côté backend (kebab-case,
// voir apps/backend/src/modules/notify/notification-events.ts) — l'icône
// tombait donc toujours sur le repli générique.
export const NOTIFICATION_ICONS: Record<string, LucideIcon> = {
  receipt: Receipt,
  "payment-reminder": Bell,
  "overdue-alert": AlertTriangle,
  "payment-declaration-pending": Clock,
  "payment-rejected": XCircle,
  "monthly-report": FileBarChart2,
  "inactivity-warning": AlertCircle,
  "account-suspended": Ban,
  "account-reactivated": CheckCircle2,
  "tenant-invitation": UserPlus,
  "lease-created": FileSignature,
  "mandate-created": Handshake,
};

export const DEFAULT_NOTIFICATION_ICON = Bell;

export interface NotificationSummary {
  id: string;
  event: string;
  titre: string;
  channel: "PUSH" | "EMAIL";
  status: "SENT" | "FAILED";
  payload?: Record<string, unknown> | null;
  createdAt: string;
  unread: boolean;
}

export function notificationIcon(event: string): LucideIcon {
  return NOTIFICATION_ICONS[event] ?? DEFAULT_NOTIFICATION_ICON;
}

export function formatNotificationDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

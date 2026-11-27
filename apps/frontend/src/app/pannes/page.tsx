'use client';

import { RoleRedirect } from '@/components/role-redirect';

const ROUTES = {
  OWNER: '/dashboard/pannes',
  MANAGER: '/gestionnaire/pannes',
  TENANT: '/locataire/pannes',
} as const;

// Adresse de la notification « Panne signalée », commune au propriétaire et
// au gestionnaire (même principe que /messages).
export default function SupportRequestsRedirectPage() {
  return <RoleRedirect routes={ROUTES} />;
}

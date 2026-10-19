import { RoleRedirect } from '@/components/role-redirect';

const ROUTES = {
  OWNER: '/dashboard/messages',
  MANAGER: '/gestionnaire/messages',
} as const;

// « Messages » sans connaître le rôle — adresse de la notification
// « Nouveau message WhatsApp » (unité 48), commune au propriétaire et au
// gestionnaire.
export default function MessagesRedirectPage() {
  return <RoleRedirect routes={ROUTES} />;
}

import { RoleRedirect } from '@/components/role-redirect';

const ROUTES = {
  OWNER: '/dashboard/locataires',
  MANAGER: '/gestionnaire/locataires',
} as const;

// « Locataires » sans connaître le rôle — adresse de la notification
// « Code WhatsApp créé » (unité 50), commune au propriétaire et au
// gestionnaire.
export default function LocatairesRedirectPage() {
  return <RoleRedirect routes={ROUTES} />;
}

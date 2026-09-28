import { RoleRedirect } from '@/components/role-redirect';

const ROUTES = {
  OWNER: '/dashboard/paiements',
  MANAGER: '/gestionnaire/paiements',
  TENANT: '/locataire/paiements/historique',
  ADMIN: '/admin/transactions',
} as const;

// « Paiements » sans connaître le rôle — utilisé par les notifications push
// (ex. « Loyer reçu »).
export default function PaiementsRedirectPage() {
  return <RoleRedirect routes={ROUTES} />;
}

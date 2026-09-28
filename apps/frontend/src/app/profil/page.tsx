import { RoleRedirect } from '@/components/role-redirect';

// Hors du composant : objet stable, jamais recréé à chaque rendu.
const ROUTES = {
  OWNER: '/dashboard/profil',
  MANAGER: '/gestionnaire/profil',
  TENANT: '/locataire/profil',
} as const;

// « Mon profil » sans connaître le rôle — utilisé par les notifications push.
export default function ProfilRedirectPage() {
  return <RoleRedirect routes={ROUTES} />;
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type UserRole } from '@/lib/auth-context';

// Point d'entrée unique pour les liens qui ne connaissent pas le rôle de
// l'utilisateur — typiquement l'URL portée par une notification push (le
// contenu d'une notification est le même pour un propriétaire et un
// gestionnaire, voir PUSH_CONTENT côté backend). Redirige vers la page du rôle
// connecté, ou vers la connexion si le rôle n'a pas de page équivalente.
export function RoleRedirect({ routes }: { routes: Partial<Record<UserRole, string>> }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    router.replace((user && routes[user.role]) || '/auth/login');
  }, [user, isLoading, router, routes]);

  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      Chargement…
    </div>
  );
}

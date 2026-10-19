'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { RoleRedirect } from '@/components/role-redirect';

// Lien direct vers une conversation sans connaître le rôle (bouton
// « Répondre » de l'alerte WhatsApp au gestionnaire, unité 48). L'adresse
// ne donne aucun accès : la page exige la connexion et le serveur revérifie
// les droits sur le bien.
export default function ConversationRedirectPage() {
  const params = useParams<{ id: string }>();
  const id = encodeURIComponent(params.id);
  const routes = useMemo(
    () => ({ OWNER: `/dashboard/messages/${id}`, MANAGER: `/gestionnaire/messages/${id}` }),
    [id],
  );
  return <RoleRedirect routes={routes} />;
}

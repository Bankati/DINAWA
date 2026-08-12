'use client';

import RequireRole from '@/components/require-role';
import AppShell from '@/components/app-shell';

// Annuaire des gestionnaires — accessible aux Propriétaires (pour choisir/
// noter un gestionnaire) et aux Gestionnaires eux-mêmes, jamais aux visiteurs
// anonymes (voir /architect : décision explicite du développeur de ne pas en
// faire une page publique malgré le backend @Public()).
export default function GestionnairesLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={['OWNER', 'MANAGER']}>
      <AppShell>
        {children}
      </AppShell>
    </RequireRole>
  );
}

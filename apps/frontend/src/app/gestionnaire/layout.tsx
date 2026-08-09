'use client';

import RequireRole from '@/components/require-role';
import AppShell from '@/components/app-shell';

export default function GestionnaireLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={['MANAGER']}>
      <AppShell>
        {children}
      </AppShell>
    </RequireRole>
  );
}

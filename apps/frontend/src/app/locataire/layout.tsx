'use client';

import RequireRole from '@/components/require-role';
import AppShell from '@/components/app-shell';

export default function LocataireLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={['TENANT']}>
      <AppShell>{children}</AppShell>
    </RequireRole>
  );
}

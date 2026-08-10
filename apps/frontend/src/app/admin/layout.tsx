'use client';

import RequireRole from '@/components/require-role';
import AppShell from '@/components/app-shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={['ADMIN']}>
      <AppShell>{children}</AppShell>
    </RequireRole>
  );
}

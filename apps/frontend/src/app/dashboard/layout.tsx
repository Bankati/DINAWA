'use client';

import RequireRole from '@/components/require-role';
import AppShell from '@/components/app-shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={['OWNER']}>
      <AppShell>{children}</AppShell>
    </RequireRole>
  );
}

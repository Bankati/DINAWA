'use client';

import RequireRole from '@/components/require-role';
import AppShell from '@/components/app-shell';
import { OwnerPrefetcher } from '@/components/prefetcher';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={['OWNER']}>
      <AppShell>
        <OwnerPrefetcher />
        {children}
      </AppShell>
    </RequireRole>
  );
}

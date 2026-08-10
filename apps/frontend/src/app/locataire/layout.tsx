'use client';

import RequireRole from '@/components/require-role';
import AppShell from '@/components/app-shell';
import { TenantPrefetcher } from '@/components/prefetcher';

export default function LocataireLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={['TENANT']}>
      <AppShell>
        <TenantPrefetcher />
        {children}
      </AppShell>
    </RequireRole>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Search, Eye } from 'lucide-react';
import { adminApi, type AdminAuditLogEntry } from '@/lib/admin';
import {
  PageHeader, Card, Badge, EmptyState, Skeleton, Input, Button,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ds';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Propriétaire', TENANT: 'Locataire', MANAGER: 'Gestionnaire', ADMIN: 'Administrateur',
};

function fmtDate(s: string) {
  return new Date(s).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminAuditLogsPage() {
  const [actionInput, setActionInput] = useState('');
  const [action, setAction] = useState('');
  const [detail, setDetail] = useState<AdminAuditLogEntry | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setAction(actionInput.trim()), 300);
    return () => clearTimeout(t);
  }, [actionInput]);

  const { data: res, isLoading: loading } = useQuery({
    queryKey: ['admin-audit-logs', action],
    queryFn: () => adminApi.listAuditLogs({ action: action || undefined, limit: 100 }),
  });
  const logs = res?.data ?? [];

  return (
    <div>
      <PageHeader title="Journal d'audit" subtitle="Toute action mutante effectuée sur la plateforme" />

      <div className="relative mb-5 max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9"
          placeholder="Rechercher une action (ex : properties, suspend…)"
          value={actionInput}
          onChange={(e) => setActionInput(e.target.value)}
        />
      </div>

      <Card>
        {loading ? (
          <div className="p-5 flex flex-col gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<History />}
            title={action ? 'Aucun résultat' : 'Aucune entrée'}
            description={action ? "Aucune action ne correspond à cette recherche." : "Le journal d'audit se remplira au fil des actions effectuées."}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Acteur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>IP</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(l.createdAt)}</TableCell>
                  <TableCell>
                    {l.actor ? (
                      <>
                        <div className="font-medium text-foreground">{l.actor.firstName} {l.actor.lastName}</div>
                        <div className="text-xs text-muted-foreground">{ROLE_LABELS[l.actor.role] ?? l.actor.role}</div>
                      </>
                    ) : <span className="text-muted-foreground">Public</span>}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-foreground">{l.action}</TableCell>
                  <TableCell>{l.entityType ? <Badge tone="neutral">{l.entityType}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-muted-foreground">{l.ipAddress ?? '—'}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setDetail(l)}>
                      <Eye className="w-3.5 h-3.5" />Détails
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent maxWidth={520}>
          <DialogHeader><DialogTitle>Détail de l&apos;action</DialogTitle></DialogHeader>
          {detail && (
            <div className="flex flex-col gap-3 text-sm">
              <div><span className="text-muted-foreground">Action :</span> <span className="font-mono">{detail.action}</span></div>
              <div><span className="text-muted-foreground">Entité :</span> {detail.entityType ?? '—'} {detail.entityId ? `(${detail.entityId})` : ''}</div>
              <div>
                <span className="text-muted-foreground">Données :</span>
                <pre className="mt-1.5 bg-ds-secondary rounded-lg p-3 text-xs overflow-x-auto max-h-64 overflow-y-auto">
                  {JSON.stringify(detail.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

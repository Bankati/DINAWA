'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Wrench } from 'lucide-react';
import {
  PageHeader, Card, Badge, Button, Input, Textarea, Label, EmptyState, Skeleton,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ds';
import { toast } from '@/components/ui';
import {
  DIRECTORY_STATUS_LABELS, TRADE_LABELS,
  type AdminArtisan, type ArtisanDirectoryStatus,
  adminArtisanAction, adminSuspendArtisan, errorMessage, formatPhone, getAdminArtisans,
} from '@/lib/artisans';
import { VerifiedMark, formatDay } from '@/components/artisans/artisan-ui';

const STATUS_TONE = { PRIVATE: 'neutral', PUBLIC: 'success', REFUSED: 'warning', SUSPENDED: 'error' } as const;

// Modération des artisans (unité 52) : badge vérifié, retrait de l'annuaire.
export default function AdminArtisansPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ArtisanDirectoryStatus | ''>('');
  const [search, setSearch] = useState('');
  const [suspending, setSuspending] = useState<AdminArtisan | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-artisans', status, search],
    queryFn: () => getAdminArtisans({ status, search: search || undefined, limit: 100 }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-artisans'] });

  const action = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: 'verify' | 'unverify' | 'reinstate' }) => adminArtisanAction(id, kind),
    onSuccess: () => { toast.success('Artisan mis à jour'); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const suspend = useMutation({
    mutationFn: () => adminSuspendArtisan((suspending as AdminArtisan).id, reason),
    onSuccess: () => { toast.success("Artisan retiré de l'annuaire"); setSuspending(null); setReason(''); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const artisans = data?.data ?? [];

  return (
    <div>
      <PageHeader title="Artisans" subtitle={`${data?.total ?? 0} artisans enregistrés par les propriétaires et gestionnaires`} />
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input className="pl-9 h-11" placeholder="Nom de l'artisan" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Rechercher" />
        </div>
        <select className="h-11 rounded-lg border border-ds-border bg-background px-3 text-sm" value={status}
          onChange={(e) => setStatus(e.target.value as ArtisanDirectoryStatus | '')} aria-label="Statut">
          <option value="">Tous les statuts</option>
          {(Object.keys(DIRECTORY_STATUS_LABELS) as ArtisanDirectoryStatus[]).map((s) => (
            <option key={s} value={s}>{DIRECTORY_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {isLoading ? <Skeleton className="h-64" /> : isError ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-destructive mb-3">Impossible de charger les artisans.</p>
          <Button variant="outline" onClick={() => refetch()}>Réessayer</Button>
        </Card>
      ) : artisans.length === 0 ? (
        <Card><EmptyState icon={<Wrench />} title="Aucun artisan" description="Les propriétaires ajoutent leurs artisans depuis leur carnet." /></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {artisans.map((a) => (
            <Card key={a.id}>
              <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-[220px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong>{a.displayName}</strong>
                    <Badge tone={STATUS_TONE[a.directoryStatus]}>{DIRECTORY_STATUS_LABELS[a.directoryStatus]}</Badge>
                    {a.verified && <VerifiedMark />}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPhone(a.phone)} · {a.trades.map((t) => TRADE_LABELS[t]).join(', ')} · {a.contactsCount} carnet(s) · ajouté par {a.createdByName} le {formatDay(a.createdAt)}
                  </div>
                  {a.consentChangedAt && <div className="text-xs text-muted-foreground">Accord ou refus le {formatDay(a.consentChangedAt)}</div>}
                  {a.suspensionReason && <div className="text-xs text-destructive">Motif du retrait : {a.suspensionReason}</div>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" disabled={action.isPending}
                    onClick={() => action.mutate({ id: a.id, kind: a.verified ? 'unverify' : 'verify' })}>
                    {a.verified ? 'Retirer le badge' : 'Marquer vérifié'}
                  </Button>
                  {a.directoryStatus === 'SUSPENDED' ? (
                    <Button size="sm" disabled={action.isPending} onClick={() => action.mutate({ id: a.id, kind: 'reinstate' })}>Remettre</Button>
                  ) : (
                    <Button size="sm" variant="destructive" onClick={() => setSuspending(a)}>Retirer</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={suspending !== null} onOpenChange={(o) => !suspend.isPending && !o && setSuspending(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Retirer {suspending?.displayName} de l&apos;annuaire</DialogTitle>
            <DialogDescription>Il n&apos;apparaîtra plus dans l&apos;annuaire et ne pourra plus être choisi pour une panne.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="suspend-reason">Motif (obligatoire)</Label>
            <Textarea id="suspend-reason" rows={3} minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspending(null)} disabled={suspend.isPending}>Annuler</Button>
            <Button variant="destructive" loading={suspend.isPending} disabled={reason.trim().length < 3} onClick={() => suspend.mutate()}>Retirer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

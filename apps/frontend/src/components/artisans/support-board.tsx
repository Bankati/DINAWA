'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Camera, Hammer, MessageCircle, Phone, Wrench } from 'lucide-react';
import {
  PageHeader, Card, Badge, Button, Input, Textarea, Label, EmptyState, Skeleton,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ds';
import { toast } from '@/components/ui';
import { formatFcfa } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  SUPPORT_STATUS_LABELS, SUPPORT_STATUS_TONES, TRADE_LABELS,
  type SupportRequestDetail, type SupportRequestStatus, type SupportRequestSummary,
  assignSupportRequest, errorMessage, formatPhone, getArtisanContacts, getSupportRequest, getSupportRequests,
  reviewSupportRequest, updateSupportRequestStatus,
} from '@/lib/artisans';
import { StarPicker, Stars, formatDay } from './artisan-ui';

const FILTERS: Array<{ value: SupportRequestStatus | ''; label: string }> = [
  { value: '', label: 'Toutes' },
  { value: 'OPEN', label: 'À traiter' },
  { value: 'ASSIGNED', label: 'Artisan choisi' },
  { value: 'IN_PROGRESS', label: 'En réparation' },
  { value: 'RESOLVED', label: 'Réparées' },
];

export function SupportRequestCard({ r, onOpen }: { r: SupportRequestSummary; onOpen: () => void }) {
  return (
    <Card>
      <button type="button" onClick={onOpen} className="w-full text-left p-5 flex flex-col gap-2 min-h-[44px] cursor-pointer">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="font-mono text-xs text-muted-foreground">{r.reference}</span>
          <div className="flex gap-1.5">
            {r.urgency === 'URGENT' && <Badge tone="error"><AlertTriangle className="w-3 h-3" />Urgent</Badge>}
            <Badge tone={SUPPORT_STATUS_TONES[r.status]}>{SUPPORT_STATUS_LABELS[r.status]}</Badge>
          </div>
        </div>
        <div className="font-semibold text-foreground line-clamp-2">{r.description}</div>
        <div className="text-xs text-muted-foreground">
          {r.property.label} · {r.trade ? TRADE_LABELS[r.trade] : 'Métier non précisé'} · {formatDay(r.createdAt)}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-3">
          <span>Locataire : {r.tenantName}</span>
          {r.photosCount > 0 && <span className="inline-flex items-center gap-1"><Camera className="w-3 h-3" />{r.photosCount}</span>}
        </div>
        {r.artisan && <div className="text-xs"><Wrench className="w-3 h-3 inline mr-1" />{r.artisan.displayName}</div>}
      </button>
    </Card>
  );
}

export function PhotoStrip({ photos }: { photos: SupportRequestDetail['photos'] }) {
  if (photos.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.filter((p) => p.url).map((p, i) => (
        <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-lg border border-ds-border">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire, hors next/image */}
          <img src={p.url} alt={`Photo ${i + 1} de la panne`} className="w-full h-full object-cover" />
        </a>
      ))}
    </div>
  );
}

// Pannes des biens — commun au propriétaire et au gestionnaire.
export function SupportBoard({ artisansRoute }: { artisansRoute: string }) {
  const [status, setStatus] = useState<SupportRequestStatus | ''>('OPEN');
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['support-requests', status],
    queryFn: () => getSupportRequests({ status, limit: 50 }),
  });
  const requests = data?.data ?? [];

  return (
    <div>
      <PageHeader title="Pannes" subtitle="Les pannes signalées par vos locataires, et l'artisan choisi pour chacune." />

      <div className="flex gap-2 flex-wrap mb-5" role="tablist" aria-label="Filtrer les pannes">
        {FILTERS.map((f) => (
          <button
            key={f.value || 'all'}
            type="button"
            role="tab"
            aria-selected={status === f.value}
            onClick={() => setStatus(f.value)}
            className={cn(
              'min-h-[44px] px-4 rounded-full text-sm border',
              status === f.value ? 'bg-primary text-primary-foreground border-primary' : 'border-ds-border hover:bg-ds-secondary',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Skeleton className="h-36" /><Skeleton className="h-36" /></div>
      ) : isError ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-destructive mb-3">Impossible de charger les pannes.</p>
          <Button variant="outline" onClick={() => refetch()}>Réessayer</Button>
        </Card>
      ) : requests.length === 0 ? (
        <Card><EmptyState icon={<Hammer />} title="Aucune panne ici" description="Vos locataires signalent les pannes depuis leur espace WARAH. Vous êtes prévenu à chaque nouveau signalement." /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((r) => <SupportRequestCard key={r.id} r={r} onOpen={() => setOpenId(r.id)} />)}
        </div>
      )}

      <SupportRequestDialog id={openId} onClose={() => setOpenId(null)} artisansRoute={artisansRoute} />
    </div>
  );
}

function SupportRequestDialog({ id, onClose, artisansRoute }: { id: string | null; onClose: () => void; artisansRoute: string }) {
  const { data: detail, isLoading, isError } = useQuery({
    queryKey: ['support-request', id],
    queryFn: () => getSupportRequest(id as string),
    enabled: id !== null,
  });
  const open = id !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        {isLoading || !detail ? (
          isError ? <p className="text-sm text-destructive">Impossible de charger cette panne.</p> : <Skeleton className="h-64" />
        ) : (
          <SupportRequestBody key={`${detail.id}-${detail.status}-${detail.artisan?.id ?? ""}`} detail={detail} artisansRoute={artisansRoute} />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Corps de la fiche : remonté (key) à chaque changement de panne, de statut
// ou d'artisan, pour repartir de formulaires vides sans effet.
function SupportRequestBody({ detail, artisansRoute }: { detail: SupportRequestDetail; artisansRoute: string }) {
  const queryClient = useQueryClient();
  const id = detail.id;
  const [artisanId, setArtisanId] = useState(detail.artisan?.id ?? '');
  const [closing, setClosing] = useState(false);
  const [cost, setCost] = useState('');
  const [paidBy, setPaidBy] = useState<'OWNER' | 'TENANT'>('OWNER');
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const { data: book } = useQuery({
    queryKey: ['artisans', '', ''],
    queryFn: () => getArtisanContacts({ limit: 100 }),
    enabled: detail.canManage,
  });

  const onDone = (updated: SupportRequestDetail, message: string) => {
    queryClient.setQueryData(['support-request', id], updated);
    queryClient.invalidateQueries({ queryKey: ['support-requests'] });
    toast.success(message);
  };

  const assign = useMutation({
    mutationFn: () => assignSupportRequest(id as string, artisanId),
    onSuccess: (d) => onDone(d, 'Artisan choisi, le locataire est prévenu'),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const status = useMutation({
    mutationFn: (body: Parameters<typeof updateSupportRequestStatus>[1]) => updateSupportRequestStatus(id as string, body),
    onSuccess: (d) => onDone(d, d.status === 'RESOLVED' ? 'Panne close, le locataire est prévenu' : 'Panne mise à jour'),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const review = useMutation({
    mutationFn: () => reviewSupportRequest(id as string, rating, comment || undefined),
    onSuccess: (d) => onDone(d, 'Merci pour votre avis'),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const active = ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(detail.status);

  return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            Panne {detail.reference}
            <Badge tone={SUPPORT_STATUS_TONES[detail.status]}>{SUPPORT_STATUS_LABELS[detail.status]}</Badge>
            {detail.urgency === 'URGENT' && <Badge tone="error">Urgent</Badge>}
          </DialogTitle>
          <DialogDescription>{detail.property.label} · signalée le {formatDay(detail.createdAt)}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm">
          <p className="whitespace-pre-wrap">{detail.description}</p>
          <PhotoStrip photos={detail.photos} />
          <div className="flex items-center justify-between gap-2 flex-wrap rounded-lg bg-ds-secondary p-3">
            <span>Locataire : <strong>{detail.tenantName}</strong>{detail.tenantPhone && ` · ${detail.tenantPhone}`}</span>
            {detail.tenantPhone && (
              <Button variant="outline" size="sm" asChild><a href={`tel:${detail.tenantPhone}`}><Phone className="w-4 h-4" />Appeler</a></Button>
            )}
          </div>
          <div>Métier : {detail.trade ? TRADE_LABELS[detail.trade] : 'non précisé'}</div>

          {detail.canManage && (detail.status === 'OPEN' || detail.status === 'ASSIGNED') && (
            <div className="flex flex-col gap-2 border-t border-ds-border pt-4">
              <Label htmlFor="sr-artisan">Artisan</Label>
              <div className="flex gap-2 flex-wrap">
                <select
                  id="sr-artisan"
                  className="h-11 flex-1 min-w-[200px] rounded-lg border border-ds-border bg-background px-3"
                  value={artisanId}
                  onChange={(e) => setArtisanId(e.target.value)}
                >
                  <option value="">Choisir dans mon carnet…</option>
                  {(book?.data ?? []).map((a) => (
                    <option key={a.id} value={a.id}>{a.displayName} — {a.trades.map((t) => TRADE_LABELS[t]).join(', ')}</option>
                  ))}
                </select>
                <Button onClick={() => assign.mutate()} loading={assign.isPending} disabled={!artisanId || artisanId === detail.artisan?.id}>
                  {detail.artisan ? 'Changer' : 'Choisir'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Personne dans votre carnet ? <Link className="underline" href={artisansRoute}>Ajoutez un artisan</Link> ou trouvez-en un dans <Link className="underline" href="/artisans" target="_blank">l&apos;annuaire WARAH</Link>.
              </p>
            </div>
          )}

          {detail.artisan && (
            <div className="flex flex-col gap-2 rounded-lg border border-ds-border p-3">
              <div>Artisan : <strong>{detail.artisan.displayName}</strong> · {formatPhone(detail.artisan.phone)}</div>
              {detail.artisanWhatsappUrl && (
                <Button variant="accent" asChild>
                  <a href={detail.artisanWhatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-4 h-4" />Prévenir l&apos;artisan sur WhatsApp</a>
                </Button>
              )}
            </div>
          )}

          {detail.canManage && active && !closing && (
            <div className="flex gap-2 flex-wrap border-t border-ds-border pt-4">
              {detail.status === 'ASSIGNED' && (
                <Button variant="outline" loading={status.isPending} onClick={() => status.mutate({ status: 'IN_PROGRESS' })}>Réparation commencée</Button>
              )}
              <Button onClick={() => setClosing(true)}>Marquer réparée</Button>
              <Button variant="ghost" loading={status.isPending} onClick={() => status.mutate({ status: 'CANCELLED' })}>Annuler la panne</Button>
            </div>
          )}

          {closing && (
            <form
              className="flex flex-col gap-3 border-t border-ds-border pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                const amount = cost ? Number(cost.replace(/\s/g, '')) : undefined;
                status.mutate({ status: 'RESOLVED', costAmount: amount, costPaidBy: amount ? paidBy : undefined, note: note || undefined });
              }}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sr-cost">Coût de l&apos;intervention (FCFA, facultatif)</Label>
                <Input id="sr-cost" className="h-11" inputMode="numeric" placeholder="15000" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d\s]/g, ''))} />
              </div>
              {cost && (
                <fieldset className="flex gap-4">
                  <legend className="text-sm mb-1">Payé par</legend>
                  {(['OWNER', 'TENANT'] as const).map((p) => (
                    <label key={p} className="flex items-center gap-2 min-h-[44px]">
                      <input type="radio" name="paidBy" checked={paidBy === p} onChange={() => setPaidBy(p)} />
                      {p === 'OWNER' ? 'Le propriétaire' : 'Le locataire'}
                    </label>
                  ))}
                </fieldset>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sr-note">Note (facultatif)</Label>
                <Textarea id="sr-note" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setClosing(false)}>Retour</Button>
                <Button type="submit" loading={status.isPending}>Confirmer la réparation</Button>
              </div>
            </form>
          )}

          {detail.status === 'RESOLVED' && (
            <div className="flex flex-col gap-2 border-t border-ds-border pt-4">
              <div>Réparée le {formatDay(detail.resolvedAt)}{detail.costAmount !== null && ` · ${formatFcfa(detail.costAmount)} payés par ${detail.costPaidBy === 'TENANT' ? 'le locataire' : 'le propriétaire'}`}</div>
              {detail.resolutionNote && <p className="text-muted-foreground">{detail.resolutionNote}</p>}
              {detail.review ? (
                <div className="flex items-center gap-2">Votre avis : <Stars value={detail.review.rating} />{detail.review.comment && <span className="text-muted-foreground">« {detail.review.comment} »</span>}</div>
              ) : detail.artisan ? (
                <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); review.mutate(); }}>
                  <span>Notez {detail.artisan.displayName} (visible dans l&apos;annuaire) :</span>
                  <StarPicker value={rating} onChange={setRating} />
                  <Textarea rows={2} maxLength={1000} placeholder="Commentaire (facultatif)" value={comment} onChange={(e) => setComment(e.target.value)} aria-label="Commentaire" />
                  <Button type="submit" disabled={rating === 0} loading={review.isPending}>Publier l&apos;avis</Button>
                </form>
              ) : null}
            </div>
          )}

          {!detail.canManage && (
            <p className="text-xs text-muted-foreground border-t border-ds-border pt-3">Ce bien est confié à un gestionnaire : c&apos;est lui qui traite les pannes.</p>
          )}
        </div>
      </>
  );
}

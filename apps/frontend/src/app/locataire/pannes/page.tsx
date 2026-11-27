'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Hammer, MessageCircle, Phone, Plus, X } from 'lucide-react';
import {
  PageHeader, Card, Badge, Button, Textarea, Label, EmptyState, Skeleton,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ds';
import { toast } from '@/components/ui';
import {
  SUPPORT_STATUS_LABELS, SUPPORT_STATUS_TONES, TRADE_LABELS,
  type ArtisanTrade,
  cancelMySupportRequest, createSupportRequest, errorMessage, formatPhone, getMySupportRequest,
  getMySupportRequests, whatsappLink,
} from '@/lib/artisans';
import { TradeSelect, formatDay } from '@/components/artisans/artisan-ui';
import { PhotoStrip, SupportRequestCard } from '@/components/artisans/support-board';

const MAX_PHOTOS = 5;

// Pannes du locataire (unité 53) : signaler, suivre, annuler.
export default function TenantSupportRequestsPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [trade, setTrade] = useState<ArtisanTrade | ''>('');
  const [urgent, setUrgent] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-support-requests'],
    queryFn: () => getMySupportRequests({ limit: 50 }),
  });
  const { data: detail } = useQuery({
    queryKey: ['my-support-request', openId],
    queryFn: () => getMySupportRequest(openId as string),
    enabled: openId !== null,
  });

  const create = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('description', description);
      if (trade) form.append('trade', trade);
      form.append('urgency', urgent ? 'URGENT' : 'NORMAL');
      photos.forEach((p) => form.append('photos', p));
      return createSupportRequest(form);
    },
    onSuccess: (r) => {
      toast.success(`Panne ${r.reference} signalée : votre propriétaire est prévenu`);
      setCreating(false);
      setDescription('');
      setTrade('');
      setUrgent(false);
      setPhotos([]);
      queryClient.invalidateQueries({ queryKey: ['my-support-requests'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelMySupportRequest(id),
    onSuccess: (d) => {
      queryClient.setQueryData(['my-support-request', d.id], d);
      queryClient.invalidateQueries({ queryKey: ['my-support-requests'] });
      toast.success('Panne annulée');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const next = [...photos, ...Array.from(files)].slice(0, MAX_PHOTOS);
    if (photos.length + files.length > MAX_PHOTOS) toast.error(`${MAX_PHOTOS} photos au plus`);
    setPhotos(next);
  }

  const requests = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Mes pannes"
        subtitle="Signalez une panne dans votre logement : votre propriétaire est prévenu et choisit un artisan."
        actions={<Button onClick={() => setCreating(true)}><Plus className="w-4 h-4" />Signaler une panne</Button>}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Skeleton className="h-36" /><Skeleton className="h-36" /></div>
      ) : isError ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-destructive mb-3">Impossible de charger vos pannes.</p>
          <Button variant="outline" onClick={() => refetch()}>Réessayer</Button>
        </Card>
      ) : requests.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Hammer />}
            title="Aucune panne signalée"
            description="Fuite, électricité, serrure… Décrivez le problème et ajoutez des photos."
            action={<Button onClick={() => setCreating(true)}><Plus className="w-4 h-4" />Signaler une panne</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((r) => <SupportRequestCard key={r.id} r={r} onOpen={() => setOpenId(r.id)} />)}
        </div>
      )}

      {/* Signalement */}
      <Dialog open={creating} onOpenChange={(o) => !create.isPending && setCreating(o)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Signaler une panne</DialogTitle>
            <DialogDescription>Votre propriétaire (ou son gestionnaire) reçoit votre signalement tout de suite.</DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sr-desc">Que se passe-t-il ?</Label>
              <Textarea id="sr-desc" rows={4} required minLength={10} maxLength={1000}
                placeholder="Ex. : l'eau coule sous l'évier de la cuisine depuis ce matin."
                value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sr-trade">Type de panne (facultatif)</Label>
              <TradeSelect id="sr-trade" value={trade} onChange={setTrade} allLabel="Je ne sais pas" />
            </div>
            <label className="flex items-center gap-2 min-h-[44px] text-sm">
              <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
              C&apos;est urgent (danger, inondation, plus de courant…)
            </label>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Photos ({photos.length}/{MAX_PHOTOS})</span>
              <div className="flex flex-wrap gap-2">
                {photos.map((p, i) => (
                  <span key={`${p.name}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-ds-secondary px-3 py-1 text-xs">
                    {p.name.length > 20 ? `${p.name.slice(0, 17)}…` : p.name}
                    <button type="button" aria-label={`Retirer ${p.name}`} className="p-1" onClick={() => setPhotos(photos.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
                onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
              <Button type="button" variant="outline" disabled={photos.length >= MAX_PHOTOS} onClick={() => fileInput.current?.click()}>
                <Camera className="w-4 h-4" />Ajouter des photos
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreating(false)} disabled={create.isPending}>Annuler</Button>
              <Button type="submit" loading={create.isPending} disabled={description.trim().length < 10}>Envoyer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Détail */}
      <Dialog open={openId !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {!detail ? <Skeleton className="h-48" /> : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  Panne {detail.reference}
                  <Badge tone={SUPPORT_STATUS_TONES[detail.status]}>{SUPPORT_STATUS_LABELS[detail.status]}</Badge>
                </DialogTitle>
                <DialogDescription>Signalée le {formatDay(detail.createdAt)} · {detail.trade ? TRADE_LABELS[detail.trade] : 'type non précisé'}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 text-sm">
                <p className="whitespace-pre-wrap">{detail.description}</p>
                <PhotoStrip photos={detail.photos} />
                {detail.artisan ? (
                  <div className="rounded-lg border border-ds-border p-3 flex flex-col gap-2">
                    <div>Artisan : <strong>{detail.artisan.displayName}</strong> · {formatPhone(detail.artisan.phone)}</div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" asChild><a href={`tel:+228${detail.artisan.phone}`}><Phone className="w-4 h-4" />Appeler</a></Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={whatsappLink(detail.artisan.phone, `Bonjour, je suis le locataire concerné par la panne ${detail.reference} (WARAH).`)} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="w-4 h-4" />WhatsApp
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : detail.status === 'OPEN' ? (
                  <p className="text-muted-foreground">Votre propriétaire va choisir un artisan. Vous serez prévenu.</p>
                ) : null}
                {detail.status === 'RESOLVED' && <p>Réparée le {formatDay(detail.resolvedAt)}.</p>}
              </div>
              {(detail.status === 'OPEN' || detail.status === 'ASSIGNED') && (
                <DialogFooter>
                  <Button variant="ghost" loading={cancel.isPending} onClick={() => cancel.mutate(detail.id)}>Annuler ce signalement</Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Phone, MessageCircle, Pencil, Trash2, Send, Copy, Wrench, MapPin, Search, ExternalLink } from 'lucide-react';
import {
  PageHeader, Card, Badge, Button, Input, Textarea, Label, EmptyState, Skeleton,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ds';
import { toast } from '@/components/ui';
import {
  DIRECTORY_STATUS_LABELS,
  type ArtisanContact, type ArtisanInvitation, type ArtisanTrade,
  createArtisan, errorMessage, formatPhone, getArtisanContacts, inviteArtisan, removeArtisan,
  updateArtisan, whatsappLink,
} from '@/lib/artisans';
import { Stars, TradeChips, TradePicker, TradeSelect, VerifiedMark, formatDay } from './artisan-ui';

const STATUS_TONE = { PRIVATE: 'neutral', PUBLIC: 'success', REFUSED: 'warning', SUSPENDED: 'error' } as const;

interface FormState {
  phone: string;
  displayName: string;
  trades: ArtisanTrade[];
  zones: string;
  privateNote: string;
}

const EMPTY_FORM: FormState = { phone: '', displayName: '', trades: [], zones: '', privateNote: '' };

// Carnet d'artisans — commun au propriétaire (/dashboard/artisans) et au
// gestionnaire (/gestionnaire/artisans).
export function ArtisanBook() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [trade, setTrade] = useState<ArtisanTrade | ''>('');
  const [editing, setEditing] = useState<ArtisanContact | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [invitation, setInvitation] = useState<{ artisan: ArtisanContact; data: ArtisanInvitation } | null>(null);
  const [removing, setRemoving] = useState<ArtisanContact | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['artisans', search, trade],
    queryFn: () => getArtisanContacts({ search: search || undefined, trade, limit: 100 }),
  });
  const artisans = data?.data ?? [];
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['artisans'] });

  const save = useMutation({
    mutationFn: () => {
      const zones = form.zones.split(',').map((z) => z.trim()).filter(Boolean);
      if (editing === 'new') {
        return createArtisan({
          phone: form.phone,
          displayName: form.displayName,
          trades: form.trades,
          zones,
          privateNote: form.privateNote || undefined,
        });
      }
      const target = editing as ArtisanContact;
      return updateArtisan(target.id, {
        ...(target.canEditDetails ? { displayName: form.displayName, trades: form.trades, zones } : {}),
        privateNote: form.privateNote,
      });
    },
    onSuccess: (artisan) => {
      toast.success(editing === 'new' ? `${artisan.displayName} ajouté à votre carnet` : 'Fiche enregistrée');
      setEditing(null);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const invite = useMutation({
    mutationFn: (artisan: ArtisanContact) => inviteArtisan(artisan.id).then((d) => ({ artisan, data: d })),
    onSuccess: (result) => {
      setInvitation(result);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (artisan: ArtisanContact) => removeArtisan(artisan.id),
    onSuccess: () => {
      toast.success('Artisan retiré de votre carnet');
      setRemoving(null);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  function openNew() {
    setForm(EMPTY_FORM);
    setEditing('new');
  }

  function openEdit(a: ArtisanContact) {
    setForm({
      phone: a.phone,
      displayName: a.displayName,
      trades: a.trades,
      zones: a.zones.join(', '),
      privateNote: a.privateNote ?? '',
    });
    setEditing(a);
  }

  const isNew = editing === 'new';
  const detailsLocked = !isNew && editing !== null && !editing.canEditDetails;

  return (
    <div>
      <PageHeader
        title="Mes artisans"
        subtitle="Vos plombiers, électriciens, maçons… de confiance, pour les pannes de vos biens."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/artisans" target="_blank"><ExternalLink className="w-4 h-4" />Annuaire WARAH</Link>
            </Button>
            <Button onClick={openNew}><Plus className="w-4 h-4" />Ajouter un artisan</Button>
          </>
        }
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input className="pl-9 h-11" placeholder="Rechercher par nom…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Rechercher un artisan" />
        </div>
        <TradeSelect value={trade} onChange={setTrade} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-48" />
        </div>
      ) : isError ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-destructive mb-3">Impossible de charger vos artisans.</p>
          <Button variant="outline" onClick={() => refetch()}>Réessayer</Button>
        </Card>
      ) : artisans.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wrench />}
            title={search || trade ? 'Aucun artisan trouvé' : 'Votre carnet est vide'}
            description="Ajoutez les artisans avec qui vous travaillez : vous les choisirez en un clic quand un locataire signale une panne."
            action={<Button onClick={openNew}><Plus className="w-4 h-4" />Ajouter un artisan</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {artisans.map((a) => (
            <Card key={a.id}>
              <div className="p-5 flex flex-col gap-3 h-full">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-foreground">{a.displayName}</div>
                    <div className="text-sm text-muted-foreground">{formatPhone(a.phone)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={STATUS_TONE[a.directoryStatus]}>{DIRECTORY_STATUS_LABELS[a.directoryStatus]}</Badge>
                    {a.verified && <VerifiedMark />}
                  </div>
                </div>
                <TradeChips trades={a.trades} />
                {a.zones.length > 0 && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{a.zones.join(', ')}</div>
                )}
                {a.ratingCount > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Stars value={a.ratingAverage} /> {a.ratingAverage.toFixed(1)} ({a.ratingCount} avis)
                  </div>
                )}
                {a.privateNote && <p className="text-sm italic text-muted-foreground border-l-2 border-secondary pl-2">{a.privateNote}</p>}
                {a.invitationPendingUntil && (
                  <p className="text-xs text-muted-foreground">Invitation envoyée, valable jusqu&apos;au {formatDay(a.invitationPendingUntil)}.</p>
                )}
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`tel:+228${a.phone}`}><Phone className="w-4 h-4" />Appeler</a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={whatsappLink(a.phone)} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-4 h-4" />WhatsApp</a>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(a)} aria-label={`Modifier ${a.displayName}`}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setRemoving(a)} aria-label={`Retirer ${a.displayName}`}><Trash2 className="w-4 h-4" /></Button>
                </div>
                {(a.directoryStatus === 'PRIVATE' || a.directoryStatus === 'REFUSED') && (
                  <Button variant="accent" size="sm" loading={invite.isPending && invite.variables?.id === a.id} onClick={() => invite.mutate(a)}>
                    <Send className="w-4 h-4" />Proposer l&apos;annuaire WARAH
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Ajout / modification */}
      <Dialog open={editing !== null} onOpenChange={(open) => !save.isPending && !open && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Ajouter un artisan' : 'Modifier la fiche'}</DialogTitle>
            {detailsLocked && (
              <DialogDescription>
                Cette fiche est dans l&apos;annuaire ou a été créée par quelqu&apos;un d&apos;autre : vous pouvez seulement modifier votre note privée.
              </DialogDescription>
            )}
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="art-phone">Numéro de téléphone</Label>
              <Input id="art-phone" className="h-11" inputMode="tel" placeholder="90 12 34 56" required disabled={!isNew}
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              {isNew && <p className="text-xs text-muted-foreground">Si cet artisan est déjà sur WARAH, sa fiche est ajoutée à votre carnet.</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="art-name">Nom affiché</Label>
              <Input id="art-name" className="h-11" placeholder="Kossi Plomberie" required minLength={2} maxLength={80} disabled={detailsLocked}
                value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Métiers</span>
              <TradePicker value={form.trades} onChange={(trades) => setForm({ ...form, trades })} disabled={detailsLocked} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="art-zones">Quartiers où il travaille</Label>
              <Input id="art-zones" className="h-11" placeholder="Bè, Tokoin, Adidogomé" disabled={detailsLocked}
                value={form.zones} onChange={(e) => setForm({ ...form, zones: e.target.value })} />
              <p className="text-xs text-muted-foreground">Séparez les quartiers par des virgules.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="art-note">Note privée (vous seul la voyez)</Label>
              <Textarea id="art-note" rows={2} maxLength={500} placeholder="Ex. : rapide, prix raisonnables"
                value={form.privateNote} onChange={(e) => setForm({ ...form, privateNote: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={save.isPending}>Annuler</Button>
              <Button type="submit" loading={save.isPending} disabled={!detailsLocked && form.trades.length === 0}>Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invitation à l'annuaire */}
      <Dialog open={invitation !== null} onOpenChange={(open) => !open && setInvitation(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Proposer l&apos;annuaire à {invitation?.artisan.displayName}</DialogTitle>
            <DialogDescription>
              Envoyez-lui ce message depuis votre WhatsApp. Sa fiche n&apos;apparaîtra dans l&apos;annuaire public que s&apos;il accepte lui-même, en ouvrant le lien (valable 7 jours).
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-ds-secondary p-3 text-sm whitespace-pre-wrap break-words">{invitation?.data.message}</div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!invitation) return;
                navigator.clipboard.writeText(invitation.data.message).then(
                  () => toast.success('Message copié'),
                  () => toast.error('Copie impossible : sélectionnez le texte à la main'),
                );
              }}
            >
              <Copy className="w-4 h-4" />Copier le message
            </Button>
            {invitation?.data.whatsappUrl && (
              <Button asChild>
                <a href={invitation.data.whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-4 h-4" />Envoyer sur WhatsApp</a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retrait du carnet */}
      <Dialog open={removing !== null} onOpenChange={(open) => !remove.isPending && !open && setRemoving(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Retirer {removing?.displayName} de votre carnet ?</DialogTitle>
            <DialogDescription>
              Sa fiche, ses avis et les pannes déjà traitées avec lui restent sur WARAH. Vous pourrez le rajouter avec son numéro.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)} disabled={remove.isPending}>Annuler</Button>
            <Button variant="destructive" loading={remove.isPending} onClick={() => removing && remove.mutate(removing)}>Retirer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

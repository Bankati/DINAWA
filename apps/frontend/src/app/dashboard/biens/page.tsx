'use client';

import { useEffect, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Archive as ArchiveIcon, Home, CheckCircle2, Building2, Wrench, UserCog } from 'lucide-react';
import { api } from '@/lib/api';
import { formatFcfa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { MandateWithParties } from '@/lib/api-types';
import {
  PageHeader, Button, Card, Badge, EmptyState, Skeleton, StatCard,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
  Label, Input, Textarea,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ds';
import { PhotoThumbnailGrid, PhotoUploadZone, toast, type PhotoGridItem } from '@/components/ui';

type PropertyType = 'VILLA' | 'APARTMENT' | 'STUDIO' | 'COMMERCIAL';
type PropertyStatus = 'OCCUPIED' | 'VACANT' | 'RENOVATION' | 'ARCHIVED';

interface PropertyPhoto { id: string; url: string; position: number; }

interface Property {
  id: string; type: PropertyType; status: PropertyStatus;
  address: string; neighborhood: string; city: string;
  surfaceArea: number | null; roomsCount: number | null;
  monthlyRent: number; monthlyCharges: number; description: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<PropertyType, string> = { VILLA: 'Villa', APARTMENT: 'Appartement', STUDIO: 'Studio', COMMERCIAL: 'Commercial' };
const STATUS_LABELS: Record<string, string> = { OCCUPIED: 'Occupé', VACANT: 'Vacant', RENOVATION: 'Travaux', ARCHIVED: 'Archivé' };
const STATUS_TONE: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = { OCCUPIED: 'success', VACANT: 'warning', RENOVATION: 'info', ARCHIVED: 'neutral' };
const FILTERS: [string, string][] = [['', 'Tous'], ['OCCUPIED', 'Occupés'], ['VACANT', 'Vacants'], ['RENOVATION', 'Travaux'], ['ARCHIVED', 'Archivés']];

// Champs numériques gardés en chaîne (comportement natif des <input>) —
// convertis en nombre juste avant l'envoi à l'API, validés ici par Zod.
const propertySchema = z.object({
  type: z.enum(['VILLA', 'APARTMENT', 'STUDIO', 'COMMERCIAL']),
  address: z.string().min(1, "L'adresse est requise"),
  neighborhood: z.string().min(1, 'Le quartier est requis'),
  city: z.string().min(1, 'La ville est requise'),
  surfaceArea: z.string().optional(),
  roomsCount: z.string().optional(),
  monthlyRent: z.string().min(1, 'Le loyer mensuel est requis').refine((v) => Number(v) > 0, 'Doit être un nombre positif'),
  monthlyCharges: z.string().optional(),
  description: z.string().optional(),
});
type PropertyFormValues = z.infer<typeof propertySchema>;

const EMPTY_VALUES: PropertyFormValues = {
  type: 'APARTMENT', address: '', neighborhood: '', city: '',
  surfaceArea: '', roomsCount: '', monthlyRent: '', monthlyCharges: '0', description: '',
};

function toPayload(v: PropertyFormValues) {
  return {
    type: v.type,
    address: v.address,
    neighborhood: v.neighborhood,
    city: v.city,
    ...(v.surfaceArea ? { surfaceArea: parseFloat(v.surfaceArea) } : {}),
    ...(v.roomsCount ? { roomsCount: parseInt(v.roomsCount) } : {}),
    monthlyRent: parseInt(v.monthlyRent),
    monthlyCharges: parseInt(v.monthlyCharges || '0'),
    ...(v.description ? { description: v.description } : {}),
  };
}

// Champs partagés création/édition — un seul rendu, deux instances RHF.
function PropertyFormFields({ form }: { form: UseFormReturn<PropertyFormValues> }) {
  const { register, watch, setValue, formState: { errors } } = form;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Type</Label>
        <Select value={watch('type')} onValueChange={(v) => setValue('type', v as PropertyType)}>
          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(TYPE_LABELS).map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Adresse</Label>
        <Input className="mt-1.5" placeholder="Ex: Rue des Cocotiers, lot 42" {...register('address')} />
        {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Quartier</Label>
          <Input className="mt-1.5" placeholder="Ex: Agbalépédogan" {...register('neighborhood')} />
          {errors.neighborhood && <p className="text-xs text-destructive mt-1">{errors.neighborhood.message}</p>}
        </div>
        <div>
          <Label>Ville</Label>
          <Input className="mt-1.5" placeholder="Ex: Lomé" {...register('city')} />
          {errors.city && <p className="text-xs text-destructive mt-1">{errors.city.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Surface (m²)</Label>
          <Input className="mt-1.5" type="number" min="1" placeholder="75" {...register('surfaceArea')} />
        </div>
        <div>
          <Label>Nombre de pièces</Label>
          <Input className="mt-1.5" type="number" min="1" placeholder="3" {...register('roomsCount')} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Loyer mensuel (FCFA)</Label>
          <Input className="mt-1.5" type="number" min="0" placeholder="150000" {...register('monthlyRent')} />
          {errors.monthlyRent && <p className="text-xs text-destructive mt-1">{errors.monthlyRent.message}</p>}
        </div>
        <div>
          <Label>Charges mensuelles (FCFA)</Label>
          <Input className="mt-1.5" type="number" min="0" placeholder="10000" {...register('monthlyCharges')} />
        </div>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea className="mt-1.5" rows={3} placeholder="Description optionnelle du bien..." {...register('description')} />
      </div>
    </div>
  );
}

export default function BiensPage() {
  const [filter, setFilter] = useState('');
  const queryClient = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: ['properties', filter],
    queryFn: () => api.get<{ data: Property[]; total: number }>(filter ? `/properties?status=${filter}&limit=100` : '/properties?limit=100'),
  });
  const biens = res?.data ?? [];

  // Requête indépendante du filtre d'onglet actif — sert uniquement aux
  // compteurs de la rangée StatCard, toujours sur l'ensemble du portefeuille.
  const { data: allRes } = useQuery({
    queryKey: ['properties', 'stats'],
    queryFn: () => api.get<{ data: Property[]; total: number }>('/properties?limit=100'),
  });
  const allBiens = allRes?.data ?? [];
  const counts = {
    total: allRes?.total ?? 0,
    occupied: allBiens.filter((b) => b.status === 'OCCUPIED').length,
    vacant: allBiens.filter((b) => b.status === 'VACANT').length,
    renovation: allBiens.filter((b) => b.status === 'RENOVATION').length,
  };

  // Mandats actifs/en attente — pour indiquer, bien par bien, s'il est
  // délégué à un gestionnaire (et à qui), sans dupliquer cette logique
  // métier (déjà utilisée sur dashboard/delegation/page.tsx).
  const { data: mandatesRaw } = useQuery({
    queryKey: ['mandates'],
    queryFn: () => api.get<MandateWithParties[]>('/mandates'),
  });
  const activeMandates = (mandatesRaw ?? []).filter((m) => m.status === 'ACTIVE');
  const delegationByProperty = new Map(activeMandates.map((m) => [m.property.id, m.manager]));
  const delegatedCount = delegationByProperty.size;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['properties'] });
  }

  const [showForm, setShowForm] = useState(false);
  const [newPropertyPhotos, setNewPropertyPhotos] = useState<File[]>([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<PhotoGridItem[]>([]);
  const createForm = useForm<PropertyFormValues>({ resolver: zodResolver(propertySchema), defaultValues: EMPTY_VALUES });

  const [editing, setEditing] = useState<Property | null>(null);
  const editForm = useForm<PropertyFormValues>({ resolver: zodResolver(propertySchema), defaultValues: EMPTY_VALUES });
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  useEffect(() => {
    const previews = newPropertyPhotos.map((file, i) => ({ id: `${file.name}-${file.lastModified}-${i}`, url: URL.createObjectURL(file) }));
    setNewPhotoPreviews(previews);
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [newPropertyPhotos]);

  function addNewPhotos(files: File[]) {
    setNewPropertyPhotos((current) => [...current, ...files].slice(0, 10));
  }
  function removeNewPhoto(id: string) {
    const index = newPhotoPreviews.findIndex((p) => p.id === id);
    if (index !== -1) setNewPropertyPhotos((current) => current.filter((_, i) => i !== index));
  }

  const createMutation = useMutation({
    mutationFn: async (values: PropertyFormValues) => {
      const created = await api.post<Property>('/properties', toPayload(values));
      if (newPropertyPhotos.length > 0) {
        const formData = new FormData();
        newPropertyPhotos.forEach((file) => formData.append('photos', file));
        try {
          await api.post(`/properties/${created.id}/photos`, formData);
        } catch (photoErr: unknown) {
          throw new Error(
            photoErr instanceof Error
              ? `Le bien a été créé, mais l'envoi des photos a échoué : ${photoErr.message}`
              : "Le bien a été créé, mais l'envoi des photos a échoué",
          );
        }
      }
      return created;
    },
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setNewPropertyPhotos([]);
      toast.success('Bien ajouté avec succès');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Erreur lors de la création'),
  });

  const editMutation = useMutation({
    mutationFn: (values: PropertyFormValues) => {
      if (!editing) throw new Error('Aucun bien sélectionné');
      return api.patch(`/properties/${editing.id}`, toPayload(values));
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success('Bien modifié avec succès');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Erreur lors de la modification'),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/properties/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Bien archivé');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Erreur lors de l'archivage"),
    onSettled: () => setArchivingId(null),
  });

  async function openEdit(p: Property) {
    setEditing(p);
    editForm.reset({
      type: p.type, address: p.address, neighborhood: p.neighborhood, city: p.city,
      surfaceArea: p.surfaceArea != null ? String(p.surfaceArea) : '',
      roomsCount: p.roomsCount != null ? String(p.roomsCount) : '',
      monthlyRent: String(p.monthlyRent), monthlyCharges: String(p.monthlyCharges),
      description: p.description ?? '',
    });
    setPhotosLoading(true);
    try {
      const detail = await api.get<{ photos: PropertyPhoto[] }>(`/properties/${p.id}`);
      setPhotos(detail.photos);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur de chargement des photos');
    } finally {
      setPhotosLoading(false);
    }
  }

  async function uploadPhotos(files: File[]) {
    if (files.length === 0 || !editing) return;
    setUploadingPhotos(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('photos', file));
      const uploaded = await api.post<PropertyPhoto[]>(`/properties/${editing.id}/photos`, formData);
      setPhotos((current) => [...current, ...uploaded]);
      invalidate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function removePhoto(photoId: string) {
    if (!editing) return;
    try {
      await api.delete(`/properties/${editing.id}/photos/${photoId}`);
      setPhotos((current) => current.filter((ph) => ph.id !== photoId));
      invalidate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  }

  return (
    <div>
      <PageHeader
        title="Mes biens"
        subtitle="Gérez votre portefeuille immobilier"
        badge={res ? `${res.total} bien${res.total > 1 ? 's' : ''}` : undefined}
        actions={
          <Button onClick={() => { createForm.reset(EMPTY_VALUES); setNewPropertyPhotos([]); setShowForm(true); }}>
            <Plus className="w-4 h-4" />Ajouter un bien
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5">
        <StatCard index={0} label="Total biens" value={counts.total} tone="primary" icon={<Home className="w-[18px] h-[18px]" />} />
        <StatCard
          index={1}
          label="Occupés"
          value={counts.occupied}
          sub={counts.total > 0 ? `${Math.round((counts.occupied / counts.total) * 100)}% du portefeuille` : undefined}
          progressPercent={counts.total > 0 ? (counts.occupied / counts.total) * 100 : undefined}
          tone="success"
          icon={<CheckCircle2 className="w-[18px] h-[18px]" />}
        />
        <StatCard index={2} label="Vacants" value={counts.vacant} tone="warning" icon={<Building2 className="w-[18px] h-[18px]" />} />
        <StatCard index={3} label="En travaux" value={counts.renovation} tone="error" icon={<Wrench className="w-[18px] h-[18px]" />} />
        <StatCard index={4} label="Délégués" value={delegatedCount} sub={delegatedCount > 0 ? 'Gérés par un tiers' : 'Aucun'} tone="primary" icon={<UserCog className="w-[18px] h-[18px]" />} />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors',
              filter === v ? 'bg-primary text-white border-primary' : 'bg-background text-foreground border-ds-border hover:border-primary/50',
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <div className="p-5 flex flex-col gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : biens.length === 0 ? (
          <EmptyState
            icon={<Home />}
            title="Aucun bien trouvé"
            description="Ajoutez votre premier bien pour commencer."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Surface</TableHead>
                <TableHead>Loyer mensuel</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Gestion</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {biens.map((b) => {
                const manager = delegationByProperty.get(b.id);
                return (
                <TableRow key={b.id}>
                  <TableCell className="font-semibold text-foreground">{TYPE_LABELS[b.type] ?? b.type}</TableCell>
                  <TableCell>
                    <div className="font-semibold text-foreground">{b.address}</div>
                    <div className="text-xs text-muted-foreground">{b.neighborhood}</div>
                  </TableCell>
                  <TableCell>{b.city}</TableCell>
                  <TableCell>{b.surfaceArea != null ? `${b.surfaceArea} m²` : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="font-bold text-primary-dark tabular-nums">{formatFcfa(b.monthlyRent)}</TableCell>
                  <TableCell><Badge tone={STATUS_TONE[b.status] ?? 'neutral'}>{STATUS_LABELS[b.status] ?? b.status}</Badge></TableCell>
                  <TableCell>
                    {manager ? (
                      <Badge tone="info">Délégué à {manager.firstName} {manager.lastName}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Vous-même</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(b)}>
                        <Pencil className="w-3.5 h-3.5" />Modifier
                      </Button>
                      {b.status !== 'ARCHIVED' && (
                        <AlertDialog open={archivingId === b.id} onOpenChange={(open) => setArchivingId(open ? b.id : null)}>
                          <Button variant="destructive" size="sm" onClick={() => setArchivingId(b.id)}>
                            <ArchiveIcon className="w-3.5 h-3.5" />Archiver
                          </Button>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Archiver ce bien ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {b.address} ne sera plus visible dans votre portefeuille actif. Cette action peut être annulée plus tard.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction variant="destructive" onClick={() => archiveMutation.mutate(b.id)}>
                                Archiver
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modale ajout */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent maxWidth={600}>
          <DialogHeader><DialogTitle>Ajouter un bien</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))} className="flex flex-col gap-4">
            <PropertyFormFields form={createForm} />
            <div>
              <Label>Photos (10 max, 5 Mo chacune)</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2.5">Ajoutez vos photos puis retirez celles que vous ne voulez pas garder avant de valider.</p>
              {newPhotoPreviews.length > 0 && <div className="mb-3"><PhotoThumbnailGrid photos={newPhotoPreviews} onRemove={removeNewPhoto} /></div>}
              <PhotoUploadZone onSelect={addNewPhotos} disabled={newPropertyPhotos.length >= 10} label={newPropertyPhotos.length >= 10 ? 'Limite de 10 photos atteinte' : 'Ajouter des photos'} />
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button type="submit" loading={createMutation.isPending}>Ajouter le bien</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modale modification — champs + photos */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent maxWidth={640}>
          <DialogHeader><DialogTitle>Modifier le bien</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit((v) => editMutation.mutate(v))} className="flex flex-col gap-4">
            <PropertyFormFields form={editForm} />
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Annuler</Button>
              <Button type="submit" loading={editMutation.isPending}>Enregistrer les modifications</Button>
            </DialogFooter>
          </form>

          <div className="border-t border-ds-border mt-6 pt-5">
            <h3 className="text-[15px] font-bold text-foreground mb-1">Photos</h3>
            <p className="text-xs text-muted-foreground mb-4">Jusqu&apos;à 10 photos, 5 Mo max chacune. Chaque ajout/suppression est appliqué immédiatement.</p>
            {photosLoading ? (
              <div className="py-2"><Skeleton className="h-20" /></div>
            ) : (
              <div className="mb-5"><PhotoThumbnailGrid photos={photos} onRemove={removePhoto} /></div>
            )}
            <PhotoUploadZone
              onSelect={(files) => void uploadPhotos(files)}
              disabled={photos.length >= 10 || uploadingPhotos}
              label={uploadingPhotos ? 'Envoi en cours…' : photos.length >= 10 ? 'Limite de 10 photos atteinte' : 'Ajouter des photos'}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useApi, TTL } from '@/lib/use-api';
import { cacheInvalidate } from '@/lib/cache';
import { formatFcfa } from '@/lib/format';
import { cn } from '@/lib/cn';
import {
  PageHeader, Button, Card, Badge, DataTable, type DataTableColumn,
  Modal, Field, Input, Select, Textarea, Skeleton, toast,
} from '@/components/ui';

type PropertyType = 'VILLA' | 'APARTMENT' | 'STUDIO' | 'COMMERCIAL';
type PropertyStatus = 'OCCUPIED' | 'VACANT' | 'RENOVATION' | 'ARCHIVED';

interface PropertyPhoto {
  id: string;
  url: string;
  position: number;
}

interface Property {
  id: string;
  type: PropertyType;
  status: PropertyStatus;
  address: string;
  neighborhood: string;
  city: string;
  surfaceArea: number | null;
  roomsCount: number | null;
  monthlyRent: number;
  monthlyCharges: number;
  description: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  VILLA: 'Villa', APARTMENT: 'Appartement', STUDIO: 'Studio', COMMERCIAL: 'Commercial',
};
const STATUS_LABELS: Record<string, string> = {
  OCCUPIED: 'Occupé', VACANT: 'Vacant', RENOVATION: 'Travaux', ARCHIVED: 'Archivé',
};
const STATUS_TONE: Record<string, 'success' | 'warning' | 'violet' | 'neutral'> = {
  OCCUPIED: 'success', VACANT: 'warning', RENOVATION: 'violet', ARCHIVED: 'neutral',
};

const FILTERS: [string, string][] = [
  ['', 'Tous'], ['OCCUPIED', 'Occupés'], ['VACANT', 'Vacants'], ['RENOVATION', 'Travaux'], ['ARCHIVED', 'Archivés'],
];

const EMPTY_FORM = {
  type: 'APARTMENT', address: '', neighborhood: '', city: '',
  surfaceArea: '', roomsCount: '', monthlyRent: '', monthlyCharges: '0', description: '',
};

export default function BiensPage() {
  const [filter, setFilter] = useState('');
  const url = filter ? `/properties?status=${filter}&limit=100` : '/properties?limit=100';
  const { data: res, loading, reload } = useApi<{ data: Property[]; total: number }>(url, TTL.LIST);
  const biens = res?.data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [newPropertyPhotos, setNewPropertyPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [archiving, setArchiving] = useState<string | null>(null);

  // Modale de modification — regroupe l'édition des champs ET la gestion
  // des photos d'un même bien (voir /architect : "modifier" doit couvrir
  // tout ce qui a été saisi à la création, y compris les photos).
  const [editing, setEditing] = useState<Property | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState('');
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photosErr, setPhotosErr] = useState('');

  async function openEdit(p: Property) {
    setEditing(p);
    setEditErr('');
    setEditForm({
      type: p.type,
      address: p.address,
      neighborhood: p.neighborhood,
      city: p.city,
      surfaceArea: p.surfaceArea != null ? String(p.surfaceArea) : '',
      roomsCount: p.roomsCount != null ? String(p.roomsCount) : '',
      monthlyRent: String(p.monthlyRent),
      monthlyCharges: String(p.monthlyCharges),
      description: p.description ?? '',
    });

    setPhotosErr('');
    setPhotosLoading(true);
    try {
      const detail = await api.get<{ photos: PropertyPhoto[] }>(`/properties/${p.id}`);
      setPhotos(detail.photos);
    } catch (err: unknown) {
      setPhotosErr(err instanceof Error ? err.message : 'Erreur de chargement des photos');
    } finally {
      setPhotosLoading(false);
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditSaving(true); setEditErr('');
    try {
      await api.patch(`/properties/${editing.id}`, {
        type: editForm.type,
        address: editForm.address,
        neighborhood: editForm.neighborhood,
        city: editForm.city,
        ...(editForm.surfaceArea ? { surfaceArea: parseFloat(editForm.surfaceArea) } : {}),
        ...(editForm.roomsCount ? { roomsCount: parseInt(editForm.roomsCount) } : {}),
        monthlyRent: parseInt(editForm.monthlyRent),
        monthlyCharges: parseInt(editForm.monthlyCharges || '0'),
        ...(editForm.description ? { description: editForm.description } : {}),
      });
      cacheInvalidate(url);
      reload();
      setEditing(null);
      toast.success('Bien modifié avec succès');
    } catch (err: unknown) {
      setEditErr(err instanceof Error ? err.message : 'Erreur lors de la modification');
    } finally { setEditSaving(false); }
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files || files.length === 0 || !editing) return;
    setUploadingPhotos(true); setPhotosErr('');
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => formData.append('photos', file));
      const uploaded = await api.post<PropertyPhoto[]>(`/properties/${editing.id}/photos`, formData);
      setPhotos(current => [...current, ...uploaded]);
      cacheInvalidate(url);
    } catch (err: unknown) {
      setPhotosErr(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function removePhoto(photoId: string) {
    if (!editing) return;
    try {
      await api.delete(`/properties/${editing.id}/photos/${photoId}`);
      setPhotos(current => current.filter(ph => ph.id !== photoId));
      cacheInvalidate(url);
    } catch (err: unknown) {
      setPhotosErr(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setFormErr('');
    try {
      const created = await api.post<Property>('/properties', {
        type: form.type,
        address: form.address,
        neighborhood: form.neighborhood,
        city: form.city,
        ...(form.surfaceArea ? { surfaceArea: parseFloat(form.surfaceArea) } : {}),
        ...(form.roomsCount ? { roomsCount: parseInt(form.roomsCount) } : {}),
        monthlyRent: parseInt(form.monthlyRent),
        monthlyCharges: parseInt(form.monthlyCharges || '0'),
        ...(form.description ? { description: form.description } : {}),
      });
      cacheInvalidate(url);
      reload();

      // Photos envoyées juste après, sur le bien qui vient d'être créé — le
      // bien reste créé même si l'upload échoue ensuite (photos ajoutables
      // plus tard via « Modifier ») ; dans ce cas la modale reste ouverte
      // pour montrer l'erreur plutôt que de faire croire à un succès complet.
      if (newPropertyPhotos.length > 0) {
        const formData = new FormData();
        newPropertyPhotos.forEach(file => formData.append('photos', file));
        try {
          await api.post(`/properties/${created.id}/photos`, formData);
        } catch (photoErr: unknown) {
          setFormErr(
            photoErr instanceof Error
              ? `Le bien a été créé, mais l'envoi des photos a échoué : ${photoErr.message}`
              : "Le bien a été créé, mais l'envoi des photos a échoué",
          );
          return;
        }
      }
      setShowForm(false);
      setNewPropertyPhotos([]);
      toast.success('Bien ajouté avec succès');
    } catch (err: unknown) {
      setFormErr(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally { setSaving(false); }
  }

  async function archive(id: string) {
    if (!confirm('Archiver ce bien ?')) return;
    setArchiving(id);
    try {
      await api.delete(`/properties/${id}`);
      cacheInvalidate(url);
      reload();
      toast.success('Bien archivé');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l’archivage');
    } finally { setArchiving(null); }
  }

  const columns: DataTableColumn<Property>[] = [
    { key: 'type', header: 'Type', render: (b) => (
      <span className="text-sm font-semibold text-gray-700">{TYPE_LABELS[b.type] ?? b.type}</span>
    ) },
    { key: 'address', header: 'Adresse', render: (b) => (
      <div>
        <div className="font-semibold text-sm text-gray-900">{b.address}</div>
        <div className="text-xs text-gray-400">{b.neighborhood}</div>
      </div>
    ) },
    { key: 'city', header: 'Ville', render: (b) => <span className="text-sm text-gray-700">{b.city}</span> },
    { key: 'surface', header: 'Surface', render: (b) => (
      b.surfaceArea != null
        ? <span className="text-sm text-gray-500">{b.surfaceArea} m²</span>
        : <span className="text-gray-300">—</span>
    ) },
    { key: 'rent', header: 'Loyer mensuel', render: (b) => (
      <span className="text-sm font-bold text-primary-dark tabular-nums">{formatFcfa(b.monthlyRent)}</span>
    ) },
    { key: 'status', header: 'Statut', render: (b) => (
      <Badge tone={STATUS_TONE[b.status] ?? 'neutral'}>{STATUS_LABELS[b.status] ?? b.status}</Badge>
    ) },
    { key: 'actions', header: 'Actions', render: (b) => (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => openEdit(b)}>Modifier</Button>
        {b.status !== 'ARCHIVED' && (
          <Button variant="danger" size="sm" onClick={() => archive(b.id)} loading={archiving === b.id}>
            Archiver
          </Button>
        )}
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader
        title="Mes biens"
        subtitle="Gérez votre portefeuille immobilier"
        badge={res ? `${res.total} bien${res.total > 1 ? 's' : ''}` : undefined}
        actions={
          <Button
            variant="accent"
            onClick={() => { setForm({ ...EMPTY_FORM }); setNewPropertyPhotos([]); setFormErr(''); setShowForm(true); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Ajouter un bien
          </Button>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors',
              filter === v ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300 hover:border-primary/50',
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={biens}
          rowKey={(b) => b.id}
          loading={loading}
          empty={{
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            ),
            title: 'Aucun bien trouvé',
            description: 'Ajoutez votre premier bien pour commencer.',
          }}
        />
      </Card>

      {/* Modal ajout */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Ajouter un bien" maxWidth={600}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Type" required>
            <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="VILLA">Villa</option>
              <option value="APARTMENT">Appartement</option>
              <option value="STUDIO">Studio</option>
              <option value="COMMERCIAL">Commercial</option>
            </Select>
          </Field>
          <Field label="Adresse" required>
            <Input required placeholder="Ex: Rue des Cocotiers, lot 42" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quartier" required>
              <Input required placeholder="Ex: Agbalépédogan" value={form.neighborhood} onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))} />
            </Field>
            <Field label="Ville" required>
              <Input required placeholder="Ex: Lomé" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Surface (m²)">
              <Input type="number" min="1" placeholder="75" value={form.surfaceArea} onChange={e => setForm(f => ({ ...f, surfaceArea: e.target.value }))} />
            </Field>
            <Field label="Nombre de pièces">
              <Input type="number" min="1" placeholder="3" value={form.roomsCount} onChange={e => setForm(f => ({ ...f, roomsCount: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Loyer mensuel (FCFA)" required>
              <Input required type="number" min="0" placeholder="150000" value={form.monthlyRent} onChange={e => setForm(f => ({ ...f, monthlyRent: e.target.value }))} />
            </Field>
            <Field label="Charges mensuelles (FCFA)">
              <Input type="number" min="0" placeholder="10000" value={form.monthlyCharges} onChange={e => setForm(f => ({ ...f, monthlyCharges: e.target.value }))} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea rows={3} placeholder="Description optionnelle du bien..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label="Photos (10 max, 5 Mo chacune)">
            <input
              type="file" accept="image/*" multiple
              onChange={e => setNewPropertyPhotos(Array.from(e.target.files ?? []).slice(0, 10))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm box-border"
            />
            {newPropertyPhotos.length > 0 && (
              <div className="text-xs text-gray-500 mt-1.5">
                {newPropertyPhotos.length} photo{newPropertyPhotos.length > 1 ? 's' : ''} sélectionnée{newPropertyPhotos.length > 1 ? 's' : ''}
              </div>
            )}
          </Field>
          {formErr && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600">{formErr}</div>}
          <div className="flex gap-2.5 justify-end">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button type="submit" loading={saving}>Ajouter le bien</Button>
          </div>
        </form>
      </Modal>

      {/* Modal modification — champs du bien + photos, tout au même endroit */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Modifier le bien" maxWidth={640}>
        <form onSubmit={submitEdit} className="flex flex-col gap-4">
          <Field label="Type" required>
            <Select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}>
              <option value="VILLA">Villa</option>
              <option value="APARTMENT">Appartement</option>
              <option value="STUDIO">Studio</option>
              <option value="COMMERCIAL">Commercial</option>
            </Select>
          </Field>
          <Field label="Adresse" required>
            <Input required value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quartier" required>
              <Input required value={editForm.neighborhood} onChange={e => setEditForm(f => ({ ...f, neighborhood: e.target.value }))} />
            </Field>
            <Field label="Ville" required>
              <Input required value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Surface (m²)">
              <Input type="number" min="1" value={editForm.surfaceArea} onChange={e => setEditForm(f => ({ ...f, surfaceArea: e.target.value }))} />
            </Field>
            <Field label="Nombre de pièces">
              <Input type="number" min="1" value={editForm.roomsCount} onChange={e => setEditForm(f => ({ ...f, roomsCount: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Loyer mensuel (FCFA)" required>
              <Input required type="number" min="0" value={editForm.monthlyRent} onChange={e => setEditForm(f => ({ ...f, monthlyRent: e.target.value }))} />
            </Field>
            <Field label="Charges mensuelles (FCFA)">
              <Input type="number" min="0" value={editForm.monthlyCharges} onChange={e => setEditForm(f => ({ ...f, monthlyCharges: e.target.value }))} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea rows={3} placeholder="Description optionnelle du bien..." value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
          </Field>
          {editErr && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600">{editErr}</div>}
          <div className="flex gap-2.5 justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Annuler</Button>
            <Button type="submit" loading={editSaving}>Enregistrer les modifications</Button>
          </div>
        </form>

        {/* Photos — gérées séparément (chaque action s'applique immédiatement) */}
        <div className="border-t border-gray-100 mt-6 pt-5">
          <h3 className="text-[15px] font-bold text-gray-900 mb-1">Photos</h3>
          <p className="text-xs text-gray-500 mb-4">Jusqu&apos;à 10 photos, 5 Mo max chacune. Chaque ajout/suppression est appliqué immédiatement.</p>

          {photosErr && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600 mb-4">{photosErr}</div>}

          {photosLoading ? (
            <div className="py-2"><Skeleton height={80} /></div>
          ) : (
            <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
              {photos.map(ph => (
                <div key={ph.id} className="relative rounded-lg overflow-hidden bg-gray-100" style={{ aspectRatio: '1' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- URLs signées Supabase temporaires, next/image ajouterait peu ici */}
                  <img src={ph.url} alt="" className="w-full h-full object-cover block" />
                  <button
                    onClick={() => removePhoto(ph.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white border-none text-sm cursor-pointer leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length === 0 && (
                <div className="col-span-full text-center py-6 text-gray-400 text-sm">Aucune photo pour l&apos;instant.</div>
              )}
            </div>
          )}

          <label
            className={cn(
              'flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-lg py-4 text-gray-700 text-sm font-semibold bg-gray-50',
              photos.length >= 10 || uploadingPhotos ? 'cursor-not-allowed' : 'cursor-pointer',
            )}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {uploadingPhotos ? 'Envoi en cours…' : photos.length >= 10 ? 'Limite de 10 photos atteinte' : 'Ajouter des photos'}
            <input
              type="file" accept="image/*" multiple hidden disabled={photos.length >= 10 || uploadingPhotos}
              onChange={e => { void uploadPhotos(e.target.files); e.target.value = ''; }}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}

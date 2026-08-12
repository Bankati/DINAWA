'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Users, Building2, UserCog, FileClock, UserSearch, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { formatFcfa } from '@/lib/format';
import type { MandateWithParties } from '@/lib/api-types';
import { toast } from '@/components/ui';
import {
  PageHeader, Button, Card, EmptyState, Badge, StatCard,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Label, Input,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ds';

interface ManagerSummary { id: string; firstName: string; lastName: string; }
interface Property {
  id: string; address: string; neighborhood: string; city: string; status: string;
}
type Mandate = MandateWithParties;

const STATUS_LABELS: Record<string, string> = { OCCUPIED: 'Occupé', VACANT: 'Vacant', RENOVATION: 'En travaux' };

const today = new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  managerEmail: '', feeType: 'PERCENTAGE' as 'PERCENTAGE' | 'FLAT',
  feeValue: '0', startDate: today, endDate: '',
};

export default function DelegationPage() {
  const queryClient = useQueryClient();
  const { data: mandatesRaw } = useQuery({
    queryKey: ['mandates'],
    queryFn: () => api.get<Mandate[]>('/mandates'),
  });
  // GET /mandates renvoie aussi les mandats REVOKED/EXPIRED (historique) —
  // seuls PENDING/ACTIVE comptent comme "délégation en cours" ici.
  const mandates = (mandatesRaw ?? []).filter((m) => m.status === 'ACTIVE' || m.status === 'PENDING');
  const { data: propsRes } = useQuery({
    queryKey: ['properties', 'all'],
    queryFn: () => api.get<{ data: Property[]; total: number } | Property[]>('/properties?limit=200'),
  });
  const allProps: Property[] = Array.isArray(propsRes) ? propsRes : (propsRes?.data ?? []);
  const invalidateMandates = () => queryClient.invalidateQueries({ queryKey: ['mandates'] });

  const managersCount = new Set(mandates.map((m) => m.manager.id)).size;
  const delegatedPropertyCount = new Set(mandates.map((m) => m.property.id)).size;
  const availableCount = allProps.length - delegatedPropertyCount;
  const pendingCount = (mandatesRaw ?? []).filter((m) => m.status === 'PENDING').length;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [selected, setSelected] = useState<string[]>([]);
  const [propSearch, setPropSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);

  // Biens déjà délégués — un bien archivé ne peut de toute façon plus être
  // géré activement, donc jamais proposé à la délégation.
  const delegatedIds = new Set(mandates.map((m) => m.property.id));
  const availableProps = allProps.filter((p) => !delegatedIds.has(p.id) && p.status !== 'ARCHIVED');

  const filteredProps = (() => {
    const q = propSearch.trim().toLowerCase();
    if (!q) return availableProps;
    return availableProps.filter(
      (p) => p.address.toLowerCase().includes(q) || p.neighborhood.toLowerCase().includes(q) || p.city.toLowerCase().includes(q),
    );
  })();
  const allFilteredSelected = filteredProps.length > 0 && filteredProps.every((p) => selected.includes(p.id));

  function toggleProp(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelected((prev) => prev.filter((id) => !filteredProps.some((p) => p.id === id)));
    } else {
      setSelected((prev) => Array.from(new Set([...prev, ...filteredProps.map((p) => p.id)])));
    }
  }

  function openForm() {
    setForm({ ...EMPTY_FORM });
    setSelected([]);
    setPropSearch('');
    setFormError('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.managerEmail) { setFormError("L'email du gestionnaire est requis"); return; }
    if (selected.length === 0) { setFormError('Sélectionnez au moins un bien'); return; }
    setSaving(true); setFormError('');
    try {
      // POST /mandates attend un managerId, jamais un email/téléphone
      // directement (voir CreateMandateDto) — on résout d'abord l'identité
      // via GET /managers/search.
      const found = await api.get<ManagerSummary[]>(`/managers/search?email=${encodeURIComponent(form.managerEmail)}`);
      if (found.length === 0) {
        setFormError('Aucun gestionnaire trouvé avec cet email — il doit déjà avoir un compte WARAH (rôle Gestionnaire).');
        return;
      }
      await api.post('/mandates', {
        managerId: found[0].id,
        propertyIds: selected,
        feeType: form.feeType,
        feeValue: Number(form.feeValue),
        startDate: form.startDate,
        ...(form.endDate ? { endDate: form.endDate } : {}),
      });
      invalidateMandates();
      setShowForm(false);
      toast.success(`${selected.length} bien${selected.length > 1 ? 's' : ''} délégué${selected.length > 1 ? 's' : ''} à ${found[0].firstName} ${found[0].lastName}`);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la délégation');
    } finally { setSaving(false); }
  }

  async function handleRevoke(id: string) {
    setRevoking(id);
    try {
      await api.post(`/mandates/${id}/revoke`, {});
      invalidateMandates();
      toast.success('Délégation révoquée');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la révocation');
    } finally { setRevoking(null); }
  }

  // Regrouper les mandats par gestionnaire
  const byManager: Record<string, { manager: Mandate['manager']; mandates: Mandate[] }> = {};
  for (const m of mandates) {
    if (!byManager[m.manager.id]) byManager[m.manager.id] = { manager: m.manager, mandates: [] };
    byManager[m.manager.id].mandates.push(m);
  }

  return (
    <div>
      <PageHeader
        title="Délégation"
        subtitle="Confiez la gestion de vos biens à un gestionnaire"
        actions={
          <>
            <Button asChild variant="outline"><Link href="/gestionnaires"><UserSearch className="w-4 h-4" />Trouver un gestionnaire</Link></Button>
            <Button variant="accent" onClick={openForm}><Plus className="w-4 h-4" />Nouvelle délégation</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <StatCard index={0} label="Biens délégués" value={delegatedPropertyCount} tone="primary" icon={<Building2 className="w-[18px] h-[18px]" />} />
        <StatCard index={1} label="Gestionnaires" value={managersCount} tone="success" icon={<UserCog className="w-[18px] h-[18px]" />} />
        <StatCard index={2} label="Biens disponibles" value={availableCount} sub="Non délégués" tone="warning" icon={<Users className="w-[18px] h-[18px]" />} />
        <StatCard index={3} label="Mandats en attente" value={pendingCount} sub={pendingCount > 0 ? "En attente d'acceptation" : 'Aucun'} tone={pendingCount > 0 ? 'error' : 'success'} icon={<FileClock className="w-[18px] h-[18px]" />} />
      </div>

      {mandates.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users />}
            title="Aucune délégation active"
            description="Vous n'avez confié aucun bien à un gestionnaire pour le moment."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.values(byManager).map(({ manager, mandates: ms }) => (
            <Card key={manager.id}>
              <div className="bg-ds-secondary border-b border-ds-border px-5 py-3.5 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 bg-primary">
                  {manager.firstName[0]}{manager.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-foreground">{manager.firstName} {manager.lastName}</div>
                  <div className="text-xs text-muted-foreground">{manager.email} {manager.phone ? `· ${manager.phone}` : ''}</div>
                </div>
                <Badge tone="info">{ms.length} bien{ms.length > 1 ? 's' : ''} délégué{ms.length > 1 ? 's' : ''}</Badge>
              </div>
              <div>
                {ms.map((m, i) => (
                  <div key={m.id} className={`px-5 py-3.5 flex items-center gap-3.5 ${i > 0 ? 'border-t border-ds-border' : ''}`}>
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground">{m.property.address}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.property.neighborhood}, {m.property.city}
                        {' · '}Commission : {m.feeType === 'PERCENTAGE' ? `${m.feeValue}%` : formatFcfa(m.feeValue)}
                        {' · '}Depuis le {new Date(m.startDate).toLocaleDateString('fr-FR')}
                        {m.endDate ? ` → ${new Date(m.endDate).toLocaleDateString('fr-FR')}` : ''}
                      </div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleRevoke(m.id)} loading={revoking === m.id}>
                      Révoquer
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent maxWidth={600}>
          <DialogHeader><DialogTitle>Nouvelle délégation</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label>Email du gestionnaire <span className="text-destructive">*</span></Label>
              <Input className="mt-1.5" type="email" required placeholder="gestionnaire@exemple.com" value={form.managerEmail} onChange={(e) => setForm((f) => ({ ...f, managerEmail: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Le gestionnaire doit déjà avoir un compte WARAH avec le rôle Gestionnaire.</p>
            </div>

            <div>
              <Label>
                Biens à déléguer <span className="text-destructive">*</span>
                <span className="text-xs font-normal text-muted-foreground ml-2">(sélectionnez un ou plusieurs)</span>
              </Label>
              {availableProps.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-3 text-sm text-amber-800 mt-1.5">
                  Tous vos biens sont déjà délégués.
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mt-1.5 mb-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        className="pl-8 h-9"
                        placeholder="Rechercher un bien (adresse, quartier, ville)…"
                        value={propSearch}
                        onChange={(e) => setPropSearch(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary whitespace-nowrap hover:underline shrink-0"
                      onClick={toggleSelectAllFiltered}
                    >
                      {allFilteredSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                  </div>
                  {filteredProps.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-6 border border-ds-border rounded-lg">
                      Aucun bien ne correspond à votre recherche.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-56 overflow-y-auto border border-ds-border rounded-lg p-3">
                      {filteredProps.map((p) => (
                        <label key={p.id} className={`flex items-center gap-2.5 cursor-pointer px-2 py-1.5 rounded-md border ${selected.includes(p.id) ? 'bg-primary-50 dark:bg-ds-secondary border-primary/20' : 'border-transparent'}`}>
                          <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleProp(p.id)} className="w-4 h-4 shrink-0 accent-primary" />
                          <div>
                            <div className="font-semibold text-sm text-foreground">{p.address}</div>
                            <div className="text-xs text-muted-foreground">{p.neighborhood}, {p.city} · {STATUS_LABELS[p.status] ?? p.status}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
              {selected.length > 0 && (
                <div className="text-xs text-primary font-semibold mt-1.5">
                  {selected.length} bien{selected.length > 1 ? 's' : ''} sélectionné{selected.length > 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type de commission</Label>
                <Select value={form.feeType} onValueChange={(v) => setForm((f) => ({ ...f, feeType: v as 'PERCENTAGE' | 'FLAT' }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Pourcentage (%)</SelectItem>
                    <SelectItem value="FLAT">Montant fixe (FCFA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{form.feeType === 'PERCENTAGE' ? 'Taux (%)' : 'Montant (FCFA)'}</Label>
                <Input className="mt-1.5" type="number" min="0" value={form.feeValue} onChange={(e) => setForm((f) => ({ ...f, feeValue: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date de début <span className="text-destructive">*</span></Label>
                <Input className="mt-1.5" type="date" required value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <Label>Date de fin <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                <Input className="mt-1.5" type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>

            {formError && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600">{formError}</div>}

            <div className="flex gap-2.5 justify-end pt-1">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button type="submit" loading={saving} disabled={availableProps.length === 0}>Confirmer la délégation</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useApi, TTL } from '@/lib/use-api';
import { cacheInvalidate } from '@/lib/cache';
import { formatFcfa } from '@/lib/format';
import type { MandateWithParties } from '@/lib/api-types';
import { PageHeader, Button, Card, Modal, Field, Input, Select, EmptyState, Badge, toast } from '@/components/ui';

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
  const { data: mandatesRaw, reload } = useApi<Mandate[]>('/mandates', TTL.LIST);
  // GET /mandates renvoie aussi les mandats REVOKED/EXPIRED (historique) —
  // seuls PENDING/ACTIVE comptent comme "délégation en cours" ici.
  const mandates = (mandatesRaw ?? []).filter(m => m.status === 'ACTIVE' || m.status === 'PENDING');
  const { data: propsRes } = useApi<{ data: Property[]; total: number } | Property[]>('/properties?limit=200', TTL.LIST);
  const allProps: Property[] = Array.isArray(propsRes) ? propsRes : (propsRes?.data ?? []);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);

  // Biens déjà délégués
  const delegatedIds = new Set(mandates.map(m => m.property.id));
  const availableProps = allProps.filter(p => !delegatedIds.has(p.id));

  function toggleProp(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function openForm() {
    setForm({ ...EMPTY_FORM });
    setSelected([]);
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
      cacheInvalidate('/mandates');
      reload();
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
      cacheInvalidate('/mandates');
      reload();
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
          <Button variant="accent" onClick={openForm}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nouvelle délégation
          </Button>
        }
      />

      {mandates.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            title="Aucune délégation active"
            description="Vous n'avez confié aucun bien à un gestionnaire pour le moment."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.values(byManager).map(({ manager, mandates: ms }) => (
            <Card key={manager.id}>
              <div className="bg-gray-50 border-b border-gray-200 px-5 py-3.5 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: 'linear-gradient(135deg, #0A2650, #0F4C81)' }}>
                  {manager.firstName[0]}{manager.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-gray-900">{manager.firstName} {manager.lastName}</div>
                  <div className="text-xs text-gray-500">{manager.email} {manager.phone ? `· ${manager.phone}` : ''}</div>
                </div>
                <Badge tone="info">{ms.length} bien{ms.length > 1 ? 's' : ''} délégué{ms.length > 1 ? 's' : ''}</Badge>
              </div>
              <div>
                {ms.map((m, i) => (
                  <div key={m.id} className={`px-5 py-3.5 flex items-center gap-3.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900">{m.property.address}</div>
                      <div className="text-xs text-gray-500">
                        {m.property.neighborhood}, {m.property.city}
                        {' · '}Commission : {m.feeType === 'PERCENTAGE' ? `${m.feeValue}%` : formatFcfa(m.feeValue)}
                        {' · '}Depuis le {new Date(m.startDate).toLocaleDateString('fr-FR')}
                        {m.endDate ? ` → ${new Date(m.endDate).toLocaleDateString('fr-FR')}` : ''}
                      </div>
                    </div>
                    <Button variant="danger" size="sm" onClick={() => handleRevoke(m.id)} loading={revoking === m.id}>
                      Révoquer
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle délégation" maxWidth={600}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Email du gestionnaire" required hint="Le gestionnaire doit déjà avoir un compte WARAH avec le rôle Gestionnaire.">
            <Input type="email" required placeholder="gestionnaire@exemple.com" value={form.managerEmail} onChange={e => setForm(f => ({ ...f, managerEmail: e.target.value }))} />
          </Field>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Biens à déléguer <span className="text-red-600">*</span>
              <span className="text-xs font-normal text-gray-400 ml-2">(sélectionnez un ou plusieurs)</span>
            </label>
            {availableProps.length === 0 ? (
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-3.5 py-3 text-sm text-orange-800">
                Tous vos biens sont déjà délégués.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {availableProps.map(p => (
                  <label key={p.id} className={`flex items-center gap-2.5 cursor-pointer px-2 py-1.5 rounded-md border ${selected.includes(p.id) ? 'bg-blue-50 border-blue-200' : 'border-transparent'}`}>
                    <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleProp(p.id)} className="w-4 h-4 shrink-0 accent-primary" />
                    <div>
                      <div className="font-semibold text-sm text-gray-900">{p.address}</div>
                      <div className="text-xs text-gray-500">{p.neighborhood}, {p.city} · {STATUS_LABELS[p.status] ?? p.status}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {selected.length > 0 && (
              <div className="text-xs text-primary font-semibold mt-1.5">
                {selected.length} bien{selected.length > 1 ? 's' : ''} sélectionné{selected.length > 1 ? 's' : ''}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type de commission">
              <Select value={form.feeType} onChange={e => setForm(f => ({ ...f, feeType: e.target.value as 'PERCENTAGE' | 'FLAT' }))}>
                <option value="PERCENTAGE">Pourcentage (%)</option>
                <option value="FLAT">Montant fixe (FCFA)</option>
              </Select>
            </Field>
            <Field label={form.feeType === 'PERCENTAGE' ? 'Taux (%)' : 'Montant (FCFA)'}>
              <Input type="number" min="0" value={form.feeValue} onChange={e => setForm(f => ({ ...f, feeValue: e.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date de début" required>
              <Input type="date" required value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </Field>
            <Field label="Date de fin" hint="Optionnel">
              <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </Field>
          </div>

          {formError && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600">{formError}</div>}

          <div className="flex gap-2.5 justify-end pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button type="submit" loading={saving} disabled={availableProps.length === 0}>Confirmer la délégation</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

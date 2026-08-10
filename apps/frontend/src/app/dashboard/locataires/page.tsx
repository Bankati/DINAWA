'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useApi, TTL } from '@/lib/use-api';
import { cacheInvalidate } from '@/lib/cache';
import { formatFcfa, initiales } from '@/lib/format';
import {
  PageHeader, Button, Card, DataTable, type DataTableColumn,
  Modal, Field, Input, Select, Textarea, toast,
} from '@/components/ui';

interface TenantSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  createdAt: string;
  activeLease: {
    id: string;
    monthlyRent: number;
    startDate: string;
    property: { id: string; address: string; neighborhood: string; city: string };
  } | null;
}

interface PropertyOption {
  id: string;
  status: 'OCCUPIED' | 'VACANT' | 'RENOVATION' | 'ARCHIVED';
  address: string;
  neighborhood: string;
  city: string;
  monthlyRent: number;
}

// 'new' = invitation d'un tout premier bail pour un locataire pas encore
// connu de la plateforme (identité à saisir) — un TenantSummary réel =
// association/gestion pour un locataire déjà existant (identité figée).
type ManagingTarget = TenantSummary | 'new';

const EMPTY_LINK_FORM = {
  firstName: '', lastName: '', phone: '', email: '',
  propertyId: '', paymentFrequency: 'MONTHLY', startDate: '', endDate: '',
  securityDeposit: '0', reminderDaysBefore: '', overdueAlertWindowDays: '',
};

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Même formule que la page publique d'annonce (annonces/[slug]/page.tsx) —
// numéro togolais à 8 chiffres préfixé 228, sinon laissé tel quel.
function whatsappLink(phone: string, firstName: string, invitationUrl: string): string {
  const digits = phone.replace(/\D/g, '');
  const international = digits.length === 8 ? `228${digits}` : digits;
  const message = `Bonjour ${firstName}, voici votre lien pour activer votre compte locataire WARAH : ${invitationUrl}`;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

export default function LocatairesPage() {
  const { data: tenants, loading, reload } = useApi<TenantSummary[]>('/tenants', TTL.LIST);
  const list = tenants ?? [];

  const [managing, setManaging] = useState<ManagingTarget | null>(null);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [linkForm, setLinkForm] = useState({ ...EMPTY_LINK_FORM });
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkErr, setLinkErr] = useState('');
  const [terminating, setTerminating] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const [justTerminated, setJustTerminated] = useState<{ propertyId: string; label: string } | null>(null);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blocking, setBlocking] = useState(false);

  const [inviteResult, setInviteResult] = useState<{ invitationUrl: string; phone: string; firstName: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  function copyInvitationLink() {
    if (!inviteResult) return;
    navigator.clipboard.writeText(inviteResult.invitationUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  async function loadAvailableProperties() {
    setPropertiesLoading(true);
    try {
      const res = await api.get<{ data: PropertyOption[] }>('/properties?limit=100');
      setProperties(res.data.filter(p => p.status === 'VACANT' || p.status === 'RENOVATION'));
    } catch (err: unknown) {
      setLinkErr(err instanceof Error ? err.message : 'Erreur de chargement des biens');
    } finally {
      setPropertiesLoading(false);
    }
  }

  function openManage(t: TenantSummary) {
    setManaging(t);
    setLinkErr('');
    setLinkForm({ ...EMPTY_LINK_FORM });
    setTerminationReason('');
    setJustTerminated(null);
    setShowBlockForm(false);
    setBlockReason('');
    if (!t.activeLease) void loadAvailableProperties();
  }

  function openInviteNew() {
    setManaging('new');
    setLinkErr('');
    setLinkForm({ ...EMPTY_LINK_FORM });
    setJustTerminated(null);
    setShowBlockForm(false);
    setBlockReason('');
    void loadAvailableProperties();
  }

  function linkField(label: string, key: keyof typeof linkForm, props: React.InputHTMLAttributes<HTMLInputElement> = {}) {
    return (
      <Field label={label} required={props.required}>
        <Input value={linkForm[key]} onChange={e => setLinkForm(f => ({ ...f, [key]: e.target.value }))} {...props} />
      </Field>
    );
  }

  async function submitTerminate() {
    if (!managing || managing === 'new' || !managing.activeLease) return;
    const { property } = managing.activeLease;
    setTerminating(true); setLinkErr('');
    try {
      await api.post(`/leases/${managing.activeLease.id}/terminate`, {
        ...(terminationReason ? { terminationReason } : {}),
      });
      cacheInvalidate('/tenants');
      reload();
      setManaging(current => (current && current !== 'new' ? { ...current, activeLease: null } : current));
      setTerminationReason('');
      setJustTerminated({ propertyId: property.id, label: `${property.address}, ${property.neighborhood}` });
      await loadAvailableProperties();
    } catch (err: unknown) {
      setLinkErr(err instanceof Error ? err.message : 'Erreur lors de la résiliation');
    } finally {
      setTerminating(false);
    }
  }

  async function submitBlock() {
    if (!managing || managing === 'new' || !justTerminated || !blockReason.trim()) return;
    setBlocking(true); setLinkErr('');
    try {
      await api.post(`/properties/${justTerminated.propertyId}/tenants/${managing.id}/block`, { reason: blockReason.trim() });
      toast.success('Locataire bloqué pour ce bien.');
      setShowBlockForm(false);
      setJustTerminated(null);
      setBlockReason('');
    } catch (err: unknown) {
      setLinkErr(err instanceof Error ? err.message : 'Erreur lors du blocage');
    } finally {
      setBlocking(false);
    }
  }

  async function submitLink(e: React.FormEvent) {
    e.preventDefault();
    if (!managing) return;
    const identity = managing === 'new'
      ? { firstName: linkForm.firstName, lastName: linkForm.lastName, phone: linkForm.phone, email: linkForm.email }
      : { firstName: managing.firstName, lastName: managing.lastName, phone: managing.phone ?? '', email: managing.email ?? '' };

    if (!identity.email || !identity.phone) {
      setLinkErr('Email et téléphone sont requis pour associer un bien à ce locataire.');
      return;
    }
    setLinkSaving(true); setLinkErr('');
    try {
      const result = await api.post<{ invitationUrl: string | null }>('/auth/invite/tenant', {
        propertyId: linkForm.propertyId,
        ...identity,
        paymentFrequency: linkForm.paymentFrequency,
        startDate: linkForm.startDate,
        ...(linkForm.endDate ? { endDate: linkForm.endDate } : {}),
        securityDeposit: parseInt(linkForm.securityDeposit || '0'),
        ...(linkForm.reminderDaysBefore ? { reminderDaysBefore: parseInt(linkForm.reminderDaysBefore) } : {}),
        ...(linkForm.overdueAlertWindowDays ? { overdueAlertWindowDays: parseInt(linkForm.overdueAlertWindowDays) } : {}),
      });
      cacheInvalidate('/tenants');
      reload();
      setManaging(null);
      if (result.invitationUrl) {
        setInviteResult({ invitationUrl: result.invitationUrl, phone: identity.phone, firstName: identity.firstName });
      } else {
        toast.success('Bien associé avec succès');
      }
    } catch (err: unknown) {
      setLinkErr(err instanceof Error ? err.message : "Erreur lors de l'association");
    } finally {
      setLinkSaving(false);
    }
  }

  const identityLocked = managing !== null && managing !== 'new';

  const columns: DataTableColumn<TenantSummary>[] = [
    { key: 'name', header: 'Locataire', render: (t) => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ background: 'linear-gradient(135deg, #0A2650, #0F4C81)' }}>
          {initiales(t.firstName, t.lastName)}
        </div>
        <div>
          <div className="font-semibold text-sm text-gray-900">{t.firstName} {t.lastName}</div>
          {t.city && <div className="text-xs text-gray-400">{t.city}</div>}
        </div>
      </div>
    ) },
    { key: 'contact', header: 'Contact', render: (t) => (
      <div>
        {t.email && <div className="text-sm text-gray-700">{t.email}</div>}
        {t.phone && <div className="text-xs text-gray-400">{t.phone}</div>}
      </div>
    ) },
    { key: 'bien', header: 'Bien loué', render: (t) => (
      t.activeLease ? (
        <div>
          <div className="text-sm font-medium text-gray-900">{t.activeLease.property.address}</div>
          <div className="text-xs text-gray-400">{t.activeLease.property.neighborhood}, {t.activeLease.property.city}</div>
        </div>
      ) : <span className="text-gray-300">—</span>
    ) },
    { key: 'depuis', header: 'Depuis le', render: (t) => (
      t.activeLease ? <span className="text-sm text-gray-500 whitespace-nowrap">{formatDate(t.activeLease.startDate)}</span> : <span className="text-gray-300">—</span>
    ) },
    { key: 'loyer', header: 'Loyer', render: (t) => (
      t.activeLease ? <span className="text-sm font-bold text-primary-dark tabular-nums whitespace-nowrap">{formatFcfa(t.activeLease.monthlyRent)}</span> : <span className="text-gray-300">—</span>
    ) },
    { key: 'actions', header: 'Actions', render: (t) => (
      <Button variant="outline" size="sm" onClick={() => openManage(t)}>
        {t.activeLease ? 'Gérer le bien' : 'Associer un bien'}
      </Button>
    ) },
  ];

  return (
    <div>
      <PageHeader
        title="Mes locataires"
        subtitle="Suivi de vos locataires actifs"
        badge={list.length > 0 ? `${list.length} locataire${list.length > 1 ? 's' : ''}` : undefined}
        actions={
          <Button variant="accent" onClick={openInviteNew}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Inviter un locataire
          </Button>
        }
      />

      <Card>
        <DataTable
          columns={columns}
          data={list}
          rowKey={(t) => t.id}
          loading={loading}
          empty={{
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            ),
            title: 'Aucun locataire',
            description: 'Cliquez sur « Inviter un locataire » pour commencer.',
          }}
        />
      </Card>

      {/* Modal gestion / invitation */}
      <Modal
        open={!!managing}
        onClose={() => setManaging(null)}
        title={managing === 'new' ? 'Inviter un locataire' : managing ? `Bien associé — ${managing.firstName} ${managing.lastName}` : ''}
        maxWidth={600}
      >
        {managing !== 'new' && managing?.activeLease ? (
          <div className="flex flex-col gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3.5">
              <div className="font-bold text-sm text-gray-900">{managing.activeLease.property.address}</div>
              <div className="text-xs text-gray-500 mb-1.5">{managing.activeLease.property.neighborhood}, {managing.activeLease.property.city}</div>
              <div className="text-sm text-gray-700">{formatFcfa(managing.activeLease.monthlyRent)}/mois — depuis le {formatDate(managing.activeLease.startDate)}</div>
            </div>
            <Field label="Motif de résiliation (optionnel)">
              <Textarea rows={2} placeholder="Ex: fin de bail à l'amiable" value={terminationReason} onChange={e => setTerminationReason(e.target.value)} />
            </Field>
            <p className="text-xs text-gray-400 m-0">Résilier ce bail libère le bien (redevient vacant, republié automatiquement) et permet d&apos;associer ce locataire à un autre bien.</p>
            {linkErr && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600">{linkErr}</div>}
            <div className="flex justify-end gap-2.5">
              <Button type="button" variant="secondary" onClick={() => setManaging(null)}>Fermer</Button>
              <Button variant="danger" onClick={submitTerminate} loading={terminating}>Résilier ce bail</Button>
            </div>
          </div>
        ) : managing ? (
          <div className="flex flex-col gap-4">
            {justTerminated && !showBlockForm && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm text-amber-800">Bail résilié pour {justTerminated.label}.</span>
                <Button variant="outline" size="sm" onClick={() => setShowBlockForm(true)}>Bloquer ce locataire pour ce bien</Button>
              </div>
            )}
            {justTerminated && showBlockForm && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3.5 flex flex-col gap-3">
                <Field label="Motif du blocage" required hint="Ce locataire ne pourra plus être invité sur ce bien précis (les autres biens restent accessibles).">
                  <Textarea rows={2} value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Ex : dégradations constatées, loyers impayés répétés…" />
                </Field>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowBlockForm(false)}>Annuler</Button>
                  <Button variant="danger" size="sm" onClick={submitBlock} loading={blocking} disabled={!blockReason.trim()}>Confirmer le blocage</Button>
                </div>
              </div>
            )}
          <form onSubmit={submitLink} className="flex flex-col gap-4">
            {identityLocked ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-700">
                {(!managing.email || !managing.phone) ? (
                  <span className="text-red-600">Email ou téléphone manquant pour ce locataire — association impossible tant que ces informations ne sont pas complètes.</span>
                ) : (
                  <>{managing.email} · {managing.phone}</>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {linkField('Prénom', 'firstName', { required: true, placeholder: 'Ama' })}
                  {linkField('Nom', 'lastName', { required: true, placeholder: 'Kodjo' })}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {linkField('Téléphone', 'phone', { required: true, placeholder: '90330557' })}
                  {linkField('Email', 'email', { required: true, type: 'email', placeholder: 'ama.kodjo@email.com' })}
                </div>
              </>
            )}
            <Field label="Bien à associer" required>
              <Select value={linkForm.propertyId} onChange={e => setLinkForm(f => ({ ...f, propertyId: e.target.value }))} required disabled={propertiesLoading}>
                <option value="">{propertiesLoading ? 'Chargement…' : 'Sélectionner un bien'}</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.address} — {p.neighborhood}, {p.city} ({formatFcfa(p.monthlyRent)})</option>
                ))}
              </Select>
              {!propertiesLoading && properties.length === 0 && (
                <div className="text-xs text-gray-400 mt-1.5">Aucun bien vacant ou en travaux disponible pour l&apos;instant.</div>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fréquence de paiement" required>
                <Select value={linkForm.paymentFrequency} onChange={e => setLinkForm(f => ({ ...f, paymentFrequency: e.target.value }))}>
                  <option value="MONTHLY">Mensuel</option>
                  <option value="QUARTERLY">Trimestriel</option>
                  <option value="BIANNUAL">Semestriel</option>
                  <option value="ANNUAL">Annuel</option>
                </Select>
              </Field>
              {linkField('Dépôt de garantie (FCFA)', 'securityDeposit', { type: 'number', min: '0', placeholder: '0' })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {linkField('Date de début', 'startDate', { required: true, type: 'date' })}
              {linkField('Date de fin', 'endDate', { type: 'date' })}
            </div>
            <div className="border-t border-gray-100 pt-4">
              <div className="text-sm font-bold text-gray-700 mb-1">Alertes de paiement</div>
              <div className="text-xs text-gray-400 mb-3">Laissez vide pour utiliser vos réglages par défaut (Paramètres).</div>
              <div className="grid grid-cols-2 gap-3">
                {linkField('Rappel avant échéance (jours)', 'reminderDaysBefore', { type: 'number', min: '1', max: '90', placeholder: 'Ex: 5' })}
                {linkField('Alerte de retard après (jours)', 'overdueAlertWindowDays', { type: 'number', min: '1', max: '90', placeholder: 'Ex: 3' })}
              </div>
            </div>
            {linkErr && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600">{linkErr}</div>}
            <div className="flex gap-2.5 justify-end">
              <Button type="button" variant="secondary" onClick={() => setManaging(null)}>Annuler</Button>
              <Button type="submit" loading={linkSaving} disabled={identityLocked && (!managing.email || !managing.phone)}>
                {managing === 'new' ? 'Inviter' : 'Associer'}
              </Button>
            </div>
          </form>
          </div>
        ) : null}
      </Modal>

      {/* Modal lien d'invitation — uniquement pour un tout nouveau locataire */}
      <Modal open={!!inviteResult} onClose={() => setInviteResult(null)} title="Locataire invité" maxWidth={520}>
        {inviteResult && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Un email de confirmation a été envoyé, mais sa livraison n&apos;est pas garantie — copiez ce lien ou envoyez-le directement par WhatsApp.
            </p>
            <div className="flex gap-2 mb-4">
              <Input readOnly value={inviteResult.invitationUrl} onFocus={e => e.target.select()} className="bg-gray-50 text-gray-700" />
              <Button variant={linkCopied ? 'secondary' : 'outline'} onClick={copyInvitationLink} className="whitespace-nowrap">
                {linkCopied ? 'Copié ✓' : 'Copier'}
              </Button>
            </div>
            <div className="flex gap-2.5 justify-end">
              <Button variant="secondary" onClick={() => setInviteResult(null)}>Fermer</Button>
              <a
                href={whatsappLink(inviteResult.phone, inviteResult.firstName, inviteResult.invitationUrl)}
                target="_blank" rel="noopener"
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white no-underline"
                style={{ background: '#25D366' }}
              >
                Envoyer par WhatsApp
              </a>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

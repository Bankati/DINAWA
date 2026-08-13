'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Check, UserCheck, UserX, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import { formatFcfa, initiales } from '@/lib/format';
import {
  PageHeader, Button, Card, EmptyState, Skeleton, StatCard,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Label, Input, Textarea,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ds';

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
// association/gestion pour un locataire déjà existant (identité figée). Le
// gestionnaire a les mêmes droits que le propriétaire sur les biens sous
// mandat ACTIVE — cette page réutilise exactement le même endpoint /tenants.
type ManagingTarget = TenantSummary | 'new';

const EMPTY_LINK_FORM = {
  firstName: '', lastName: '', phone: '', email: '',
  propertyId: '', paymentFrequency: 'MONTHLY', startDate: '', endDate: '',
  securityDeposit: '0', reminderDaysBefore: '', overdueAlertWindowDays: '',
};

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function whatsappLink(phone: string, firstName: string, invitationUrl: string): string {
  const digits = phone.replace(/\D/g, '');
  const international = digits.length === 8 ? `228${digits}` : digits;
  const message = `Bonjour ${firstName}, voici votre lien pour activer votre compte locataire WARAH : ${invitationUrl}`;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

export default function GestionnaireLocatairesPage() {
  const queryClient = useQueryClient();
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get<TenantSummary[]>('/tenants'),
  });
  const list = tenants ?? [];
  const invalidateTenants = () => queryClient.invalidateQueries({ queryKey: ['tenants'] });

  const avecBail = list.filter((t) => t.activeLease).length;
  const sansBail = list.length - avecBail;
  const revenuLocatifTotal = list.reduce((sum, t) => sum + (t.activeLease?.monthlyRent ?? 0), 0);

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
      setProperties(res.data.filter((p) => p.status === 'VACANT' || p.status === 'RENOVATION'));
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
      <div>
        <Label>{label} {props.required && <span className="text-destructive">*</span>}</Label>
        <Input className="mt-1.5" value={linkForm[key]} onChange={(e) => setLinkForm((f) => ({ ...f, [key]: e.target.value }))} {...props} />
      </div>
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
      invalidateTenants();
      setManaging((current) => (current && current !== 'new' ? { ...current, activeLease: null } : current));
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
      invalidateTenants();
      setManaging(null);
      if (result.invitationUrl) {
        setInviteResult({ invitationUrl: result.invitationUrl, phone: identity.phone, firstName: identity.firstName });
      }
    } catch (err: unknown) {
      setLinkErr(err instanceof Error ? err.message : "Erreur lors de l'association");
    } finally {
      setLinkSaving(false);
    }
  }

  const identityLocked = managing !== null && managing !== 'new';

  return (
    <div>
      <PageHeader
        title="Locataires"
        subtitle="Locataires des biens sous votre mandat et de vos biens propres"
        badge={list.length > 0 ? `${list.length} locataire${list.length > 1 ? 's' : ''}` : undefined}
        actions={<Button onClick={openInviteNew}><Plus className="w-4 h-4" />Inviter un locataire</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <StatCard index={0} label="Total locataires" value={isLoading ? '—' : list.length} tone="primary" icon={<Users className="w-[18px] h-[18px]" />} />
        <StatCard
          index={1}
          label="Avec bail actif"
          value={isLoading ? '—' : avecBail}
          progressPercent={isLoading || list.length === 0 ? undefined : (avecBail / list.length) * 100}
          tone="success"
          icon={<UserCheck className="w-[18px] h-[18px]" />}
        />
        <StatCard index={2} label="Sans bail actif" value={isLoading ? '—' : sansBail} tone="warning" icon={<UserX className="w-[18px] h-[18px]" />} />
        <StatCard index={3} label="Revenu locatif total" value={isLoading ? '—' : formatFcfa(revenuLocatifTotal)} sub="Cumul des baux actifs" tone="error" icon={<Wallet className="w-[18px] h-[18px]" />} />
      </div>

      <Card>
        {isLoading ? (
          <div className="p-5 flex flex-col gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : list.length === 0 ? (
          <EmptyState icon={<Users />} title="Aucun locataire" description="Les locataires des biens que vous gérez apparaîtront ici." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Locataire</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Bien loué</TableHead>
                <TableHead>Depuis le</TableHead>
                <TableHead>Loyer</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 bg-primary">
                        {initiales(t.firstName, t.lastName)}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{t.firstName} {t.lastName}</div>
                        {t.city && <div className="text-xs text-muted-foreground">{t.city}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {t.email && <div className="text-foreground">{t.email}</div>}
                    {t.phone && <div className="text-xs text-muted-foreground">{t.phone}</div>}
                  </TableCell>
                  <TableCell>
                    {t.activeLease ? (
                      <div>
                        <div className="font-medium text-foreground">{t.activeLease.property.address}</div>
                        <div className="text-xs text-muted-foreground">{t.activeLease.property.neighborhood}, {t.activeLease.property.city}</div>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {t.activeLease ? formatDate(t.activeLease.startDate) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="font-bold text-primary-dark tabular-nums whitespace-nowrap">
                    {t.activeLease ? formatFcfa(t.activeLease.monthlyRent) : <span className="text-muted-foreground font-normal">—</span>}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openManage(t)}>
                      {t.activeLease ? 'Gérer le bien' : 'Associer un bien'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modale gestion / invitation */}
      <Dialog open={!!managing} onOpenChange={(open) => !open && setManaging(null)}>
        <DialogContent maxWidth={600}>
          <DialogHeader>
            <DialogTitle>
              {managing === 'new' ? 'Inviter un locataire' : managing ? `Bien associé — ${managing.firstName} ${managing.lastName}` : ''}
            </DialogTitle>
          </DialogHeader>

          {managing !== 'new' && managing?.activeLease ? (
            <div className="flex flex-col gap-4">
              <div className="bg-ds-secondary border border-ds-border rounded-lg px-4 py-3.5">
                <div className="font-bold text-sm text-foreground">{managing.activeLease.property.address}</div>
                <div className="text-xs text-muted-foreground mb-1.5">{managing.activeLease.property.neighborhood}, {managing.activeLease.property.city}</div>
                <div className="text-sm text-foreground">{formatFcfa(managing.activeLease.monthlyRent)}/mois — depuis le {formatDate(managing.activeLease.startDate)}</div>
              </div>
              <div>
                <Label>Motif de résiliation (optionnel)</Label>
                <Textarea className="mt-1.5" rows={2} placeholder="Ex: fin de bail à l'amiable" value={terminationReason} onChange={(e) => setTerminationReason(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground m-0">Résilier ce bail libère le bien (redevient vacant, republié automatiquement) et permet d&apos;associer ce locataire à un autre bien.</p>
              {linkErr && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600">{linkErr}</div>}
              <div className="flex justify-end gap-2.5">
                <Button type="button" variant="secondary" onClick={() => setManaging(null)}>Fermer</Button>
                <Button variant="destructive" onClick={submitTerminate} loading={terminating}>Résilier ce bail</Button>
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
                  <div>
                    <Label>Motif du blocage <span className="text-destructive">*</span></Label>
                    <p className="text-xs text-muted-foreground mt-1 mb-1.5">Ce locataire ne pourra plus être invité sur ce bien précis (les autres biens restent accessibles).</p>
                    <Textarea rows={2} value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Ex : dégradations constatées, loyers impayés répétés…" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setShowBlockForm(false)}>Annuler</Button>
                    <Button variant="destructive" size="sm" onClick={submitBlock} loading={blocking} disabled={!blockReason.trim()}>Confirmer le blocage</Button>
                  </div>
                </div>
              )}
              <form onSubmit={submitLink} className="flex flex-col gap-4">
                {identityLocked ? (
                  <div className="bg-ds-secondary border border-ds-border rounded-lg px-3.5 py-2.5 text-sm text-foreground">
                    {(!managing.email || !managing.phone) ? (
                      <span className="text-destructive">Email ou téléphone manquant pour ce locataire — association impossible tant que ces informations ne sont pas complètes.</span>
                    ) : (
                      <>{managing.email} · {managing.phone}</>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {linkField('Prénom', 'firstName', { required: true, placeholder: 'Ama' })}
                      {linkField('Nom', 'lastName', { required: true, placeholder: 'Kodjo' })}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {linkField('Téléphone', 'phone', { required: true, placeholder: '90330557' })}
                      {linkField('Email', 'email', { required: true, type: 'email', placeholder: 'ama.kodjo@email.com' })}
                    </div>
                  </>
                )}
                <div>
                  <Label>Bien à associer <span className="text-destructive">*</span></Label>
                  <Select value={linkForm.propertyId} onValueChange={(v) => setLinkForm((f) => ({ ...f, propertyId: v }))} disabled={propertiesLoading}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder={propertiesLoading ? 'Chargement…' : 'Sélectionner un bien'} /></SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.address} — {p.neighborhood}, {p.city} ({formatFcfa(p.monthlyRent)})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!propertiesLoading && properties.length === 0 && (
                    <div className="text-xs text-muted-foreground mt-1.5">Aucun bien vacant ou en travaux disponible pour l&apos;instant.</div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Fréquence de paiement <span className="text-destructive">*</span></Label>
                    <Select value={linkForm.paymentFrequency} onValueChange={(v) => setLinkForm((f) => ({ ...f, paymentFrequency: v }))}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MONTHLY">Mensuel</SelectItem>
                        <SelectItem value="QUARTERLY">Trimestriel</SelectItem>
                        <SelectItem value="BIANNUAL">Semestriel</SelectItem>
                        <SelectItem value="ANNUAL">Annuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {linkField('Dépôt de garantie (FCFA)', 'securityDeposit', { type: 'number', min: '0', placeholder: '0' })}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {linkField('Date de début', 'startDate', { required: true, type: 'date' })}
                  {linkField('Date de fin', 'endDate', { type: 'date' })}
                </div>
                <div className="border-t border-ds-border pt-4">
                  <div className="text-sm font-bold text-foreground mb-1">Alertes de paiement</div>
                  <div className="text-xs text-muted-foreground mb-3">Laissez vide pour utiliser les réglages par défaut (Paramètres).</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
        </DialogContent>
      </Dialog>

      {/* Modale lien d'invitation — uniquement pour un tout nouveau locataire */}
      <Dialog open={!!inviteResult} onOpenChange={(open) => !open && setInviteResult(null)}>
        <DialogContent maxWidth={520}>
          <DialogHeader><DialogTitle>Locataire invité</DialogTitle></DialogHeader>
          {inviteResult && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Un email de confirmation a été envoyé, mais sa livraison n&apos;est pas garantie — copiez ce lien ou envoyez-le directement par WhatsApp.
              </p>
              <div className="flex gap-2 mb-4">
                <Input readOnly value={inviteResult.invitationUrl} onFocus={(e) => e.target.select()} className="bg-ds-secondary text-foreground" />
                <Button variant={linkCopied ? 'secondary' : 'outline'} onClick={copyInvitationLink} className="whitespace-nowrap">
                  {linkCopied ? <><Check className="w-3.5 h-3.5" />Copié</> : 'Copier'}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}

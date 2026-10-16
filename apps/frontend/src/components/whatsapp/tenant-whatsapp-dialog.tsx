'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Check, MessageCircle } from 'lucide-react';
import {
  Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label, Skeleton,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ds';
import {
  COLLECTION_METHOD_LABELS,
  WhatsappConsentMethod,
  WhatsappStatus,
  changeTenantWhatsappPhone,
  getTenantWhatsapp,
  recordTenantRefusal,
  requestTenantConsent,
  resetTenantPin,
  tenantWhatsappKey,
  whatsappBadge,
} from '@/lib/whatsapp';

export interface WhatsappTenant {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

type Mode = 'view' | 'request' | 'refusal' | 'phone' | 'reset-pin';

const METHODS = Object.keys(COLLECTION_METHOD_LABELS) as WhatsappConsentMethod[];

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Ramène « +228 90 33 05 57 » à « 90330557 » pour préremplir le champ —
// le backend fait la même normalisation et valide le résultat.
function localDigits(phone: string | null): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('228') ? digits.slice(3) : digits;
}

// Fenêtre « WhatsApp » d'un locataire, côté agence (unité 45). L'agence
// déclare l'accord recueilli (→ « en attente »), montre le QR code au
// locataire, qui l'active en envoyant le message pré-rempli. readOnly :
// propriétaire d'un bien sous mandat actif (seul le gestionnaire agit).
export function TenantWhatsappDialog({
  tenant,
  readOnly = false,
  onClose,
}: {
  tenant: WhatsappTenant | null;
  readOnly?: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: status, isLoading, error } = useQuery({
    queryKey: tenantWhatsappKey(tenant?.id ?? ''),
    queryFn: () => getTenantWhatsapp(tenant!.id),
    enabled: !!tenant,
  });

  const [mode, setMode] = useState<Mode>('view');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<WhatsappConsentMethod | ''>('');
  const [attested, setAttested] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  function reset(next: Mode = 'view') {
    setMode(next);
    setErr('');
    setMethod('');
    setAttested(false);
    setPhone(localDigits(status?.whatsappPhone ?? tenant?.phone ?? null));
  }

  function close() {
    reset();
    onClose();
  }

  async function run(action: () => Promise<WhatsappStatus>) {
    if (!tenant) return;
    setSaving(true);
    setErr('');
    try {
      const updated = await action();
      queryClient.setQueryData(tenantWhatsappKey(tenant.id), updated);
      // Badge de la liste des locataires.
      void queryClient.invalidateQueries({ queryKey: ['tenants'] });
      reset();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Une erreur est survenue, réessayez.');
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    if (!status?.contactLink) return;
    navigator.clipboard.writeText(status.contactLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  const badge = status ? whatsappBadge(status) : null;
  const stopped = status?.consent === 'STOPPED';
  // Le QR code sert à confirmer l'accord (demande en cours) ou à vérifier le
  // numéro (accord donné depuis l'espace locataire, numéro pas encore vérifié).
  const showQr =
    !!status?.contactLink &&
    ((status.consent === 'PENDING' && !status.requestExpired) || (status.consent === 'ACCEPTED' && !status.phoneVerified));
  const canRequest = status?.consent === 'NOT_ASKED' || status?.consent === 'PENDING';

  return (
    <Dialog open={!!tenant} onOpenChange={(open) => !open && close()}>
      <DialogContent maxWidth={560}>
        <DialogHeader>
          <DialogTitle>WhatsApp — {tenant?.firstName} {tenant?.lastName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col gap-3"><Skeleton className="h-10" /><Skeleton className="h-24" /></div>
        ) : error || !status ? (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600">
            {error instanceof Error ? error.message : 'Impossible de charger l’état WhatsApp.'}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* État */}
            <div className="bg-ds-secondary border border-ds-border rounded-lg px-4 py-3.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {badge && <Badge tone={badge.tone} dot>{badge.label}</Badge>}
                {status.whatsappPhone && <span className="text-sm text-foreground tabular-nums">{status.whatsappPhone}</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {status.phoneVerified
                  ? 'Numéro vérifié : le locataire a déjà écrit à WARAH depuis ce numéro.'
                  : 'Numéro pas encore vérifié : aucun message ne part tant que le locataire n’a pas écrit à WARAH.'}
              </div>
              {status.consent === 'PENDING' && status.requestExpiresAt && (
                <div className="text-xs text-muted-foreground">
                  {status.requestExpired
                    ? `Demande expirée le ${formatDate(status.requestExpiresAt)} — relancez-la si le locataire est d’accord.`
                    : `Demande valable jusqu’au ${formatDate(status.requestExpiresAt)}.`}
                </div>
              )}
            </div>

            {stopped && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                Le locataire a arrêté les messages WhatsApp. Lui seul peut les réactiver, depuis son espace WARAH
                ou en écrivant « REPRENDRE » à WARAH.
              </div>
            )}

            {readOnly && (
              <p className="text-xs text-muted-foreground m-0">
                Ce bien est géré par un gestionnaire (mandat actif) : vous consultez cet état en lecture seule.
              </p>
            )}

            {/* QR code « Écrire à WARAH » */}
            {showQr && mode === 'view' && (
              <div className="border border-ds-border rounded-lg px-4 py-4 flex flex-col items-center gap-3 text-center">
                <div className="text-sm font-bold text-foreground">Faites scanner ce code au locataire</div>
                <div className="bg-white p-3 rounded-lg">
                  <QRCodeSVG value={status.contactLink!} size={184} level="M" title="Écrire à WARAH sur WhatsApp" />
                </div>
                <p className="text-xs text-muted-foreground m-0 max-w-sm">
                  {status.consent === 'PENDING'
                    ? 'WhatsApp s’ouvre avec le message « OUI, j’accepte… » déjà écrit : le locataire n’a qu’à l’envoyer. C’est ce message qui active WhatsApp.'
                    : 'Le locataire envoie le message pré-rempli : cela vérifie son numéro.'}
                </p>
                <div className="flex gap-2 flex-wrap justify-center">
                  <Button variant="outline" className="min-h-11" onClick={copyLink}>
                    {linkCopied ? <><Check className="w-4 h-4" />Lien copié</> : 'Copier le lien'}
                  </Button>
                </div>
              </div>
            )}

            {/* Formulaire : déclarer l'accord */}
            {mode === 'request' && (
              <form
                className="flex flex-col gap-3.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!method || !attested) return;
                  void run(() => requestTenantConsent(tenant!.id, { whatsappPhone: phone, collectionMethod: method, attestation: true }));
                }}
              >
                <div>
                  <Label htmlFor="wa-phone">Numéro WhatsApp du locataire <span className="text-destructive">*</span></Label>
                  <Input id="wa-phone" className="mt-1.5" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="90330557" required />
                </div>
                <div>
                  <Label>Comment l’accord a-t-il été donné ? <span className="text-destructive">*</span></Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as WhatsappConsentMethod)}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      {METHODS.map((m) => <SelectItem key={m} value={m}>{COLLECTION_METHOD_LABELS[m]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-start gap-3 min-h-11 cursor-pointer text-sm text-foreground">
                  <input type="checkbox" className="mt-1 w-5 h-5 shrink-0 accent-[var(--color-primary)]" checked={attested} onChange={(e) => setAttested(e.target.checked)} />
                  <span>{status.notice.agencyAttestation}</span>
                </label>
                <p className="text-xs text-muted-foreground m-0">
                  WhatsApp sera « en attente » : il ne s’activera que quand le locataire aura envoyé « OUI » à WARAH (un QR code s’affichera juste après).
                </p>
                {err && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600">{err}</div>}
                <div className="flex justify-end gap-2.5">
                  <Button type="button" variant="secondary" className="min-h-11" onClick={() => reset()}>Annuler</Button>
                  <Button type="submit" className="min-h-11" loading={saving} disabled={!method || !attested || !phone}>Enregistrer la demande</Button>
                </div>
              </form>
            )}

            {/* Formulaire : noter un refus */}
            {mode === 'refusal' && (
              <form
                className="flex flex-col gap-3.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (method) void run(() => recordTenantRefusal(tenant!.id, method));
                }}
              >
                <p className="text-sm text-foreground m-0">
                  Le locataire ne veut pas (ou plus) recevoir de messages WhatsApp. Plus rien ne lui sera envoyé, et
                  <strong> lui seul</strong> pourra réactiver.
                </p>
                <div>
                  <Label>Comment l’a-t-il exprimé ? <span className="text-destructive">*</span></Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as WhatsappConsentMethod)}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      {METHODS.map((m) => <SelectItem key={m} value={m}>{COLLECTION_METHOD_LABELS[m]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {err && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600">{err}</div>}
                <div className="flex justify-end gap-2.5">
                  <Button type="button" variant="secondary" className="min-h-11" onClick={() => reset()}>Annuler</Button>
                  <Button type="submit" variant="destructive" className="min-h-11" loading={saving} disabled={!method}>Noter le refus</Button>
                </div>
              </form>
            )}

            {/* Formulaire : changer de numéro */}
            {mode === 'phone' && (
              <form
                className="flex flex-col gap-3.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(() => changeTenantWhatsappPhone(tenant!.id, phone));
                }}
              >
                <div>
                  <Label htmlFor="wa-new-phone">Nouveau numéro WhatsApp <span className="text-destructive">*</span></Label>
                  <Input id="wa-new-phone" className="mt-1.5" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="90330557" required />
                </div>
                <p className="text-xs text-muted-foreground m-0">
                  Changer de numéro remet tout à zéro : l’accord devra être redonné, le numéro revérifié et le code recréé par le locataire.
                </p>
                {err && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600">{err}</div>}
                <div className="flex justify-end gap-2.5">
                  <Button type="button" variant="secondary" className="min-h-11" onClick={() => reset()}>Annuler</Button>
                  <Button type="submit" className="min-h-11" loading={saving} disabled={!phone}>Changer le numéro</Button>
                </div>
              </form>
            )}

            {/* Confirmation : réinitialiser le code */}
            {mode === 'reset-pin' && (
              <div className="flex flex-col gap-3.5">
                <p className="text-sm text-foreground m-0">
                  Le code actuel ne fonctionnera plus. Le locataire devra en générer un nouveau dans son espace WARAH
                  (vous ne le verrez jamais).
                </p>
                {err && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600">{err}</div>}
                <div className="flex justify-end gap-2.5">
                  <Button type="button" variant="secondary" className="min-h-11" onClick={() => reset()}>Annuler</Button>
                  <Button variant="destructive" className="min-h-11" loading={saving} onClick={() => void run(() => resetTenantPin(tenant!.id))}>
                    Réinitialiser le code
                  </Button>
                </div>
              </div>
            )}

            {/* Code locataire + actions */}
            {mode === 'view' && (
              <>
                <div className="text-sm text-foreground">
                  <span className="font-semibold">Code locataire : </span>
                  {status.pinSet ? 'créé par le locataire' : 'pas encore créé (le locataire le génère dans son espace)'}
                </div>
                {err && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600">{err}</div>}
                <div className="flex justify-end gap-2.5 flex-wrap">
                  {!readOnly && !stopped && canRequest && (
                    <Button className="min-h-11" onClick={() => reset('request')}>
                      <MessageCircle className="w-4 h-4" />
                      {status.consent === 'PENDING' ? 'Relancer la demande' : 'Activer WhatsApp'}
                    </Button>
                  )}
                  {!readOnly && !stopped && status.consent !== 'NOT_ASKED' && (
                    <Button variant="outline" className="min-h-11" onClick={() => reset('phone')}>Changer le numéro</Button>
                  )}
                  {!readOnly && status.pinSet && (
                    <Button variant="outline" className="min-h-11" onClick={() => reset('reset-pin')}>Réinitialiser le code</Button>
                  )}
                  {!readOnly && !stopped && (
                    <Button variant="ghost" className="min-h-11" onClick={() => reset('refusal')}>Noter un refus</Button>
                  )}
                  <Button variant="secondary" className="min-h-11" onClick={close}>Fermer</Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

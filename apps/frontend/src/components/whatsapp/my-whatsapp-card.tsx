'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { Badge, Button, Input, Label, Skeleton } from '@/components/ds';
import {
  MY_WHATSAPP_KEY,
  WhatsappStatus,
  changeMyWhatsappPhone,
  generateMyPin,
  getMyWhatsapp,
  setMyConsent,
  whatsappBadge,
} from '@/lib/whatsapp';

type Mode = 'view' | 'phone' | 'pin-confirm';

// WhatsApp dans l'espace locataire (unité 45) : activer / arrêter les
// messages de service, changer de numéro, générer son code. C'est le seul
// endroit (avec « OUI » et « REPRENDRE » envoyés à WARAH) où l'accord est
// vraiment donné — l'agence ne fait que le demander.
export function MyWhatsappCard() {
  const queryClient = useQueryClient();
  const { data: status, isLoading, error } = useQuery({ queryKey: MY_WHATSAPP_KEY, queryFn: getMyWhatsapp });

  const [mode, setMode] = useState<Mode>('view');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  // Code affiché une seule fois : gardé en mémoire de la page uniquement,
  // jamais en cache React Query ni dans le navigateur.
  const [newPin, setNewPin] = useState<string | null>(null);

  async function run(action: () => Promise<WhatsappStatus>, message: string) {
    setSaving(true);
    setErr('');
    setInfo('');
    try {
      const updated = await action();
      queryClient.setQueryData(MY_WHATSAPP_KEY, updated);
      setMode('view');
      setInfo(message);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Une erreur est survenue, réessayez.');
    } finally {
      setSaving(false);
    }
  }

  async function createPin() {
    setSaving(true);
    setErr('');
    setInfo('');
    try {
      const { pin } = await generateMyPin();
      setNewPin(pin);
      setMode('view');
      void queryClient.invalidateQueries({ queryKey: MY_WHATSAPP_KEY });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Impossible de créer le code, réessayez.');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <div className="flex flex-col gap-3"><Skeleton className="h-6 w-40" /><Skeleton className="h-16" /></div>;
  }
  if (error || !status) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600">
        {error instanceof Error ? error.message : 'Impossible de charger vos réglages WhatsApp.'}
      </div>
    );
  }

  const badge = whatsappBadge(status);
  const active = status.consent === 'ACCEPTED';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-base font-bold text-foreground m-0 flex items-center gap-2">
          <MessageCircle className="w-4 h-4" /> Messages WhatsApp
        </h2>
        <Badge tone={badge.tone} dot>{badge.label}</Badge>
      </div>

      <p className="text-sm text-muted-foreground m-0">{status.notice.tenantNotice}</p>

      {status.whatsappPhone && (
        <div className="text-sm text-foreground">
          Numéro : <span className="font-semibold tabular-nums">{status.whatsappPhone}</span>
          {' — '}
          {status.phoneVerified ? 'vérifié' : 'pas encore vérifié'}
        </div>
      )}

      {/* Numéro à vérifier : il suffit d'écrire une fois à WARAH. */}
      {(active || status.consent === 'PENDING') && !status.phoneVerified && status.contactLink && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 flex flex-col gap-2.5">
          <span>
            {status.consent === 'PENDING'
              ? 'Votre agence a demandé votre accord. Envoyez le message « OUI » à WARAH depuis ce numéro pour activer WhatsApp.'
              : 'Dernière étape : envoyez le message pré-rempli à WARAH depuis ce numéro. Aucun message ne vous sera envoyé avant.'}
          </span>
          <a
            href={status.contactLink}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start min-h-11 inline-flex items-center gap-2 rounded-lg px-4 text-sm font-bold text-white no-underline"
            style={{ background: '#25D366' }}
          >
            Écrire à WARAH sur WhatsApp
          </a>
        </div>
      )}

      {status.consent === 'STOPPED' && (
        <div className="text-sm text-muted-foreground">
          Vous avez arrêté les messages WhatsApp. Vous pouvez les réactiver ici, ou en écrivant « REPRENDRE » à WARAH.
        </div>
      )}

      {info && <div className="bg-green-50 border border-green-200 rounded-lg px-3.5 py-2.5 text-sm text-green-700 font-semibold">✓ {info}</div>}
      {err && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600">{err}</div>}

      {mode === 'phone' && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => changeMyWhatsappPhone(phone), 'Numéro WhatsApp mis à jour');
          }}
        >
          <div>
            <Label htmlFor="my-wa-phone">Nouveau numéro WhatsApp</Label>
            <Input id="my-wa-phone" className="mt-1.5" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="90330557" required />
          </div>
          <p className="text-xs text-muted-foreground m-0">
            Changer de numéro remet WhatsApp à zéro : vous devrez réactiver, écrire à WARAH depuis le nouveau numéro et recréer votre code.
          </p>
          <div className="flex justify-end gap-2.5">
            <Button type="button" variant="secondary" className="min-h-11" onClick={() => setMode('view')}>Annuler</Button>
            <Button type="submit" className="min-h-11" loading={saving} disabled={!phone}>Enregistrer</Button>
          </div>
        </form>
      )}

      {/* Code affiché une seule fois */}
      {newPin && (
        <div className="border-2 border-dashed border-ds-border rounded-lg px-4 py-4 flex flex-col items-center gap-2 text-center">
          <div className="text-sm text-foreground font-semibold">Votre code WhatsApp</div>
          <div className="text-3xl font-extrabold tracking-[0.3em] tabular-nums text-foreground" aria-live="polite">{newPin}</div>
          <p className="text-xs text-muted-foreground m-0 max-w-sm">
            Notez-le maintenant : il ne sera plus jamais affiché. Ne le donnez à personne, pas même à votre agence.
            Le robot WARAH vous le demandera pour les actions sensibles.
          </p>
          <Button variant="outline" className="min-h-11" onClick={() => setNewPin(null)}>J’ai noté mon code</Button>
        </div>
      )}

      {mode === 'pin-confirm' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-foreground m-0">Votre code actuel ne fonctionnera plus. Créer un nouveau code ?</p>
          <div className="flex justify-end gap-2.5">
            <Button type="button" variant="secondary" className="min-h-11" onClick={() => setMode('view')}>Annuler</Button>
            <Button className="min-h-11" loading={saving} onClick={() => void createPin()}>Créer un nouveau code</Button>
          </div>
        </div>
      )}

      {mode === 'view' && !newPin && (
        <div className="flex gap-2.5 flex-wrap justify-end">
          {active ? (
            <Button variant="outline" className="min-h-11" loading={saving} onClick={() => void run(() => setMyConsent('WITHDRAW'), 'Messages WhatsApp arrêtés')}>
              Arrêter les messages WhatsApp
            </Button>
          ) : (
            <Button className="min-h-11" loading={saving} onClick={() => void run(() => setMyConsent('ACCEPT'), 'Messages WhatsApp activés')}>
              Activer les messages WhatsApp
            </Button>
          )}
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => {
              setPhone(status.whatsappPhone ?? '');
              setErr('');
              setMode('phone');
            }}
          >
            {status.whatsappPhone ? 'Changer de numéro' : 'Indiquer mon numéro'}
          </Button>
          <Button variant="outline" className="min-h-11" onClick={() => (status.pinSet ? setMode('pin-confirm') : void createPin())} loading={saving && !status.pinSet}>
            {status.pinSet ? 'Créer un nouveau code' : 'Créer mon code'}
          </Button>
        </div>
      )}
    </div>
  );
}

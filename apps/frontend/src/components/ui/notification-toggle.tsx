'use client';

import { useState } from 'react';
import { useApi } from '@/lib/use-api';
import { cacheInvalidate } from '@/lib/cache';
import { subscribeToPush, unsubscribeFromPush, declineNotifications, isPushSupported } from '@/lib/push';
import { Button } from './button';
import { toast } from './toast';

interface ProfileConsent {
  notificationConsent: 'NOT_ASKED' | 'ACCEPTED' | 'DECLINED';
}

// Autosuffisant : lit /profile lui-même (déjà en cache si la page l'a déjà
// chargé) — se dépose sans câblage dans n'importe quelle page profil.
export function NotificationToggle() {
  const { data, reload } = useApi<ProfileConsent>('/profile', 60_000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const consent = data?.notificationConsent ?? 'NOT_ASKED';
  const supported = isPushSupported();

  async function refresh() {
    cacheInvalidate('/profile');
    reload();
  }

  async function handleEnable() {
    setBusy(true); setError('');
    try {
      await subscribeToPush();
      await refresh();
      toast.success('Notifications activées');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'activation");
    } finally { setBusy(false); }
  }

  async function handleDisable() {
    setBusy(true); setError('');
    try {
      await unsubscribeFromPush();
      await refresh();
      toast.success('Notifications désactivées');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la désactivation');
    } finally { setBusy(false); }
  }

  async function handleDecline() {
    setBusy(true); setError('');
    try {
      await declineNotifications();
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally { setBusy(false); }
  }

  if (!supported) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-500">
        Les notifications push ne sont pas supportées par ce navigateur.
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <div className="font-semibold text-sm text-gray-900">Notifications push</div>
        <p className="text-xs text-gray-500 mt-1 max-w-sm">
          {consent === 'ACCEPTED'
            ? 'Activées sur cet appareil — rappels d’échéance, alertes et confirmations en temps réel.'
            : 'Recevez vos rappels de paiement et alertes directement dans le navigateur, en plus des emails.'}
        </p>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {consent === 'ACCEPTED' ? (
          <Button variant="outline" size="sm" onClick={handleDisable} loading={busy}>Désactiver</Button>
        ) : (
          <>
            <Button size="sm" onClick={handleEnable} loading={busy}>Activer</Button>
            {consent === 'NOT_ASKED' && (
              <Button variant="ghost" size="sm" onClick={handleDecline} disabled={busy}>Plus tard</Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

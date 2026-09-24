'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { subscribeToPush, declineNotifications, isPushSupported } from '@/lib/push';
import { toast } from '@/components/ui';
import './notification-permission-prompt.css';

interface Props {
  consent: 'NOT_ASKED' | 'ACCEPTED' | 'DECLINED' | undefined;
  // Force AppShell à relire /profile — fait disparaître le bandeau partout
  // (toutes les interfaces partagent AppShell) sans rechargement de page.
  onResolved: () => void;
}

// Prompt automatique à la WhatsApp Web : proposé une fois par session tant
// que l'utilisateur n'a jamais répondu (NOT_ASKED), jamais réaffiché après
// une réponse explicite — jamais de mention de VAPID ou de détail technique
// (voir /architect notifications, demande développeur 2026-09-24).
export function NotificationPermissionPrompt({ consent, onResolved }: Props) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (consent !== 'NOT_ASKED' || !isPushSupported()) {
      setVisible(false);
      return;
    }
    // Si le navigateur a déjà bloqué les notifications pour ce site (en
    // dehors de WARAH), redemander ne ferait rien réapparaître côté
    // navigateur — inutile d'insister avec notre propre bandeau.
    if (Notification.permission === 'denied') {
      setVisible(false);
      return;
    }
    // Laisse la page se stabiliser avant de solliciter — jamais dès le
    // premier rendu, qui coïnciderait avec le clignotement du tableau de
    // bord pendant son chargement.
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, [consent]);

  async function handleEnable() {
    setBusy(true);
    try {
      await subscribeToPush();
      toast.success('Notifications activées');
      setVisible(false);
      onResolved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'activation des notifications");
      setBusy(false);
    }
  }

  async function handleDecline() {
    setBusy(true);
    try {
      await declineNotifications();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur, réessayez');
      setBusy(false);
      return;
    }
    setVisible(false);
    onResolved();
  }

  if (!visible) return null;

  return (
    <div className="notif-prompt" role="dialog" aria-label="Activer les notifications">
      <button
        type="button"
        className="notif-prompt-close"
        onClick={handleDecline}
        disabled={busy}
        aria-label="Ne pas activer les notifications"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="notif-prompt-row">
        <div className="notif-prompt-icon">
          <Bell className="w-5 h-5" />
        </div>
        <div className="notif-prompt-body">
          <div className="notif-prompt-title">Activer les notifications ?</div>
          <p className="notif-prompt-text">
            Soyez alerté en temps réel des paiements et rappels importants, même quand WARAH n&apos;est pas ouvert.
          </p>
        </div>
      </div>
      <div className="notif-prompt-actions">
        <button type="button" className="notif-prompt-decline" onClick={handleDecline} disabled={busy}>
          Non merci
        </button>
        <button type="button" className="notif-prompt-enable" onClick={handleEnable} disabled={busy}>
          {busy ? 'Activation…' : 'Activer'}
        </button>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { notificationsApi, EVENT_LABELS, type NotificationSummary } from '@/lib/notifications';
import './notifications-bell.css';

export function NotificationsBell({ notificationsHref }: { notificationsHref: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    notificationsApi.getUnreadCount().then((r) => setUnreadCount(r.count)).catch(() => {});
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const toggle = () => {
    setIsOpen((v) => !v);
    if (!loaded) {
      notificationsApi.list(5).then(setItems).catch(() => {}).finally(() => setLoaded(true));
    }
  };

  return (
    <div ref={wrapRef} className="nb-wrap">
      <button type="button" className={`hero-notif-btn${unreadCount > 0 ? ' has-alertes' : ''}`} onClick={toggle} aria-label="Notifications" aria-expanded={isOpen}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
        {unreadCount > 0 && <span className="hero-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="nb-panel"
            initial={{ opacity: 0, y: -8, scaleY: 0.96 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.96, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', bounce: 0.15, duration: 0.28 }}
          >
            <p className="nb-panel-title">Notifications</p>
            {!loaded ? (
              <div className="nb-empty">Chargement…</div>
            ) : items.length === 0 ? (
              <div className="nb-empty">Aucune notification récente</div>
            ) : (
              <div className="nb-list">
                {items.map((n) => (
                  <div key={n.id} className="nb-item">
                    <span className="nb-item-dot" />
                    <div className="nb-item-body">
                      <p className="nb-item-title">{EVENT_LABELS[n.event] ?? n.titre}</p>
                      <p className="nb-item-date">{new Date(n.createdAt).toLocaleString('fr-FR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href={notificationsHref} className="nb-see-all" onClick={() => setIsOpen(false)}>Voir toutes les notifications</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

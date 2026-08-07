'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { adminApi, type AdminUserDetail } from '@/lib/admin';
import { initiales } from '@/lib/format';
import { cacheInvalidate } from '@/lib/cache';

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Propriétaire', TENANT: 'Locataire', MANAGER: 'Gestionnaire', ADMIN: 'Administrateur',
};
const ROLE_COLOR: Record<string, string> = {
  OWNER: '#0F4C81', MANAGER: '#C9982E', TENANT: '#1F7A5C', ADMIN: '#B5563A',
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Actif',
  SUSPENDED_INACTIVITY: 'Suspendu — inactivité',
  SUSPENDED_PAYMENT: 'Suspendu — paiement',
  SUSPENDED_ADMIN: 'Suspendu — admin',
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#059669', SUSPENDED_INACTIVITY: '#D97706', SUSPENDED_PAYMENT: '#DC2626', SUSPENDED_ADMIN: '#DC2626',
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
      <span style={{ fontSize: 12.5, color: '#9CA3AF', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13.5, color: '#111827', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function CompteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!id) return;
    adminApi.getUser(id)
      .then(setUser)
      .catch(() => setError('Impossible de charger ce compte.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ height: 200, borderRadius: 14, background: 'linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        <style>{`@keyframes shimmer { to { background-position: -200% 0; } }`}</style>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '12px 16px', borderRadius: 10, marginBottom: 16 }}>{error || 'Compte introuvable.'}</div>
        <Link href="/admin/comptes" style={{ color: '#0F4C81', fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>← Retour aux comptes</Link>
      </div>
    );
  }

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await adminApi.deleteUser(id);
      cacheInvalidate('/admin/users');
      router.push('/admin/comptes');
    } catch (err: any) {
      setDeleteError(err.message || 'Erreur lors de la suppression');
      setDeleting(false);
    }
  };

  const statusColor = STATUS_COLOR[user.accountStatus] ?? '#6B7280';
  const roleColor = ROLE_COLOR[user.role] ?? '#6B7280';

  return (
    <div style={{ maxWidth: 680, padding: 28 }}>
      {/* Retour */}
      <Link href="/admin/comptes" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#9CA3AF', fontSize: 13, textDecoration: 'none', marginBottom: 20, fontWeight: 500 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}><polyline points="15 18 9 12 15 6"/></svg>
        Retour aux comptes
      </Link>

      {/* Carte identité */}
      <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 2px 12px rgba(15,76,129,0.07)', border: '1px solid #E8EDF5', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: roleColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, flexShrink: 0 }}>
            {initiales(user.firstName, user.lastName)}
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0A2650', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
              {user.firstName} {user.lastName}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, background: `${roleColor}18`, color: roleColor, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 700, background: `${statusColor}15`, color: statusColor, padding: '3px 10px', borderRadius: 20 }}>
                {STATUS_LABEL[user.accountStatus] ?? user.accountStatus}
              </span>
            </div>
          </div>
        </div>

        <div>
          <InfoRow label="Email" value={user.email ?? '—'} />
          <InfoRow label="Téléphone" value={user.phone ?? '—'} />
          <InfoRow label="Ville" value={user.city ?? '—'} />
          <InfoRow label="Rôle" value={ROLE_LABEL[user.role] ?? user.role} />
          <InfoRow
            label={user.role === 'OWNER' || user.role === 'MANAGER' ? 'Biens' : 'Baux actifs'}
            value={user.role === 'OWNER' || user.role === 'MANAGER'
              ? `${user._count.ownedProperties} bien${user._count.ownedProperties !== 1 ? 's' : ''}`
              : `${user._count.leasesAsTenant} bail${user._count.leasesAsTenant !== 1 ? 's' : ''}`}
          />
          <InfoRow label="Tentatives connexion échouées" value={user.failedLoginAttempts} />
          <InfoRow
            label="Compte bloqué jusqu'au"
            value={user.lockedUntil ? new Date(user.lockedUntil).toLocaleString('fr-FR') : 'Non bloqué'}
          />
          <InfoRow
            label="Créé le"
            value={new Date(user.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
          />
          <InfoRow
            label="Mis à jour le"
            value={new Date(user.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
          />
          <InfoRow label="ID interne" value={<span style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#9CA3AF' }}>{user.id}</span>} />
        </div>
      </div>

      {/* Zone danger */}
      <div style={{ background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 14, padding: '20px 24px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#991B1B', margin: '0 0 6px' }}>Zone de danger</h2>
        <p style={{ fontSize: 13, color: '#7F1D1D', margin: '0 0 16px', lineHeight: 1.5 }}>
          La suppression anonymise définitivement ce compte et révoque l'accès immédiatement. Cette action est irréversible.
        </p>
        {deleteError && (
          <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
            {deleteError}
          </div>
        )}
        <button
          onClick={() => setShowDeleteModal(true)}
          style={{ background: '#DC2626', color: 'white', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
        >
          Supprimer ce compte
        </button>
      </div>

      {/* Modale de confirmation */}
      {showDeleteModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div
            style={{ background: 'white', borderRadius: 16, padding: 28, maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 32, marginBottom: 12, textAlign: 'center' }}>⚠️</div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#111827', margin: '0 0 10px', textAlign: 'center' }}>
              Supprimer ce compte ?
            </h2>
            <p style={{ fontSize: 13.5, color: '#6B7280', lineHeight: 1.6, margin: '0 0 8px', textAlign: 'center' }}>
              Le compte de <strong style={{ color: '#111827' }}>{user.firstName} {user.lastName}</strong> sera anonymisé.
            </p>
            <p style={{ fontSize: 13, color: '#DC2626', textAlign: 'center', margin: '0 0 24px', fontWeight: 600 }}>
              Cette action est irréversible.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{ flex: 1, background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 9, padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{ flex: 1, background: '#DC2626', color: 'white', border: 'none', borderRadius: 9, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? 'Suppression…' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

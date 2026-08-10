'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { adminApi, type AdminUserDetail } from '@/lib/admin';
import { initiales } from '@/lib/format';
import { cacheInvalidate } from '@/lib/cache';
import { Card, CardBody, Badge, Button, Modal, Skeleton, toast } from '@/components/ui';

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Propriétaire', TENANT: 'Locataire', MANAGER: 'Gestionnaire', ADMIN: 'Administrateur',
};
const ROLE_TONE: Record<string, 'info' | 'accent' | 'success' | 'error'> = {
  OWNER: 'info', MANAGER: 'accent', TENANT: 'success', ADMIN: 'error',
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Actif',
  SUSPENDED_INACTIVITY: 'Suspendu — inactivité',
  SUSPENDED_PAYMENT: 'Suspendu — paiement',
  SUSPENDED_ADMIN: 'Suspendu — admin',
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
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

  useEffect(() => {
    if (!id) return;
    adminApi.getUser(id)
      .then(setUser)
      .catch(() => setError('Impossible de charger ce compte.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <Card><CardBody><div className="p-2"><Skeleton height={160} /></div></CardBody></Card>;
  }

  if (error || !user) {
    return (
      <div>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error || 'Compte introuvable.'}</div>
        <Link href="/admin/comptes" className="text-primary text-sm font-semibold no-underline">← Retour aux comptes</Link>
      </div>
    );
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await adminApi.deleteUser(id);
      cacheInvalidate('/admin/users');
      toast.success('Compte supprimé avec succès.');
      router.push('/admin/comptes');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Link href="/admin/comptes" className="inline-flex items-center gap-1.5 text-gray-400 text-sm no-underline mb-5 font-medium hover:text-gray-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><polyline points="15 18 9 12 15 6" /></svg>
        Retour aux comptes
      </Link>

      <Card>
        <CardBody>
          <div className="flex items-center gap-4.5 mb-6">
            <div
              className={`rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shrink-0 ${
                user.role === 'OWNER' ? 'bg-primary' : user.role === 'MANAGER' ? 'bg-accent' : user.role === 'TENANT' ? 'bg-green-600' : 'bg-red-700'
              }`}
              style={{ width: 60, height: 60 }}
            >
              {initiales(user.firstName, user.lastName)}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-primary-dark m-0 mb-1.5">{user.firstName} {user.lastName}</h1>
              <div className="flex items-center gap-2">
                <Badge tone={ROLE_TONE[user.role] ?? 'neutral'}>{ROLE_LABEL[user.role] ?? user.role}</Badge>
                <Badge tone={user.accountStatus === 'ACTIVE' ? 'success' : 'error'}>{STATUS_LABEL[user.accountStatus] ?? user.accountStatus}</Badge>
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
            <InfoRow label="ID interne" value={<span className="font-mono text-xs text-gray-400">{user.id}</span>} />
          </div>
        </CardBody>
      </Card>

      <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-5 mt-5">
        <h2 className="text-sm font-bold text-red-800 m-0 mb-1.5">Zone de danger</h2>
        <p className="text-sm text-red-700 m-0 mb-4 leading-relaxed">
          La suppression anonymise définitivement ce compte et révoque l&apos;accès immédiatement. Cette action est irréversible.
        </p>
        <Button variant="danger" onClick={() => setShowDeleteModal(true)}>Supprimer ce compte</Button>
      </div>

      <Modal open={showDeleteModal} onClose={() => !deleting && setShowDeleteModal(false)} title="Supprimer ce compte ?" maxWidth={420}>
        <p className="text-sm text-gray-500 text-center mb-2">
          Le compte de <strong className="text-gray-900">{user.firstName} {user.lastName}</strong> sera anonymisé.
        </p>
        <p className="text-sm text-red-600 text-center font-semibold mb-6">Cette action est irréversible.</p>
        <div className="flex gap-2.5 justify-center">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Annuler</Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleting}>Confirmer la suppression</Button>
        </div>
      </Modal>
    </div>
  );
}

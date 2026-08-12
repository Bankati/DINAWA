'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { adminApi } from '@/lib/admin';
import { initiales } from '@/lib/format';
import {
  Card, CardBody, Badge, Button, Skeleton, Label, Textarea,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ds';
import { toast } from '@/components/ui';

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
    <div className="flex justify-between items-center py-3 border-b border-ds-border last:border-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

export default function CompteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params?.id as string;

  const { data: user, isLoading: loading, isError } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => adminApi.getUser(id),
    enabled: !!id,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  const invalidateUser = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Compte supprimé avec succès.');
      router.push('/admin/comptes');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression'),
  });

  const suspendMutation = useMutation({
    mutationFn: () => adminApi.suspendUser(id, suspendReason.trim()),
    onSuccess: () => {
      invalidateUser();
      toast.success('Compte suspendu.');
      setShowSuspendModal(false);
      setSuspendReason('');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Erreur lors de la suspension'),
  });

  const reactivateMutation = useMutation({
    mutationFn: () => adminApi.reactivateUser(id),
    onSuccess: () => {
      invalidateUser();
      toast.success('Compte réactivé.');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Erreur lors de la réactivation'),
  });

  if (loading) {
    return <Card><CardBody><Skeleton className="h-40" /></CardBody></Card>;
  }

  if (isError || !user) {
    return (
      <div>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">Impossible de charger ce compte.</div>
        <Link href="/admin/comptes" className="text-primary text-sm font-semibold no-underline">← Retour aux comptes</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link href="/admin/comptes" className="inline-flex items-center gap-1.5 text-muted-foreground text-sm no-underline mb-5 font-medium hover:text-foreground">
        <ArrowLeft className="w-3.5 h-3.5" />
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
            {user.accountStatus === 'SUSPENDED_ADMIN' && (
              <InfoRow label="Motif de suspension" value={user.suspensionReason ?? '—'} />
            )}
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
            <InfoRow label="ID interne" value={<span className="font-mono text-xs text-muted-foreground">{user.id}</span>} />
          </div>
        </CardBody>
      </Card>

      {user.accountStatus !== 'ACTIVE' ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-5 mt-5">
          <h2 className="text-sm font-bold text-amber-900 m-0 mb-1.5">Compte suspendu</h2>
          <p className="text-sm text-amber-800 m-0 mb-4 leading-relaxed">
            Réactiver ce compte le repasse immédiatement à Actif et lève toutes les restrictions.
          </p>
          <Button onClick={() => reactivateMutation.mutate()} loading={reactivateMutation.isPending}>
            Réactiver ce compte
          </Button>
        </div>
      ) : user.role !== 'ADMIN' ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-5 mt-5">
          <h2 className="text-sm font-bold text-amber-900 m-0 mb-1.5">Suspension manuelle</h2>
          <p className="text-sm text-amber-800 m-0 mb-4 leading-relaxed">
            Bloque immédiatement les actions de modification pour cet utilisateur, avec notification par email. Réversible à tout moment.
          </p>
          <Button variant="secondary" onClick={() => setShowSuspendModal(true)}>Suspendre ce compte</Button>
        </div>
      ) : null}

      <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-5 mt-5">
        <h2 className="text-sm font-bold text-red-800 m-0 mb-1.5">Zone de danger</h2>
        <p className="text-sm text-red-700 m-0 mb-4 leading-relaxed">
          La suppression anonymise définitivement ce compte et révoque l&apos;accès immédiatement. Cette action est irréversible.
        </p>
        <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>Supprimer ce compte</Button>
      </div>

      <Dialog open={showSuspendModal} onOpenChange={(open) => !suspendMutation.isPending && setShowSuspendModal(open)}>
        <DialogContent maxWidth={440}>
          <DialogHeader><DialogTitle>Suspendre ce compte</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Le motif est communiqué à <strong className="text-foreground">{user.firstName} {user.lastName}</strong> par email.
          </p>
          <Label>Motif <span className="text-destructive">*</span></Label>
          <Textarea className="mt-1.5" rows={3} value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Ex : activité frauduleuse signalée par un locataire" />
          <div className="flex gap-2.5 justify-end mt-4">
            <Button variant="secondary" onClick={() => setShowSuspendModal(false)} disabled={suspendMutation.isPending}>Annuler</Button>
            <Button variant="destructive" onClick={() => suspendMutation.mutate()} disabled={!suspendReason.trim()} loading={suspendMutation.isPending}>
              Confirmer la suspension
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteModal} onOpenChange={(open) => !deleteMutation.isPending && setShowDeleteModal(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte de <strong className="text-foreground">{user.firstName} {user.lastName}</strong> sera anonymisé. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => deleteMutation.mutate()}>
              Confirmer la suppression
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

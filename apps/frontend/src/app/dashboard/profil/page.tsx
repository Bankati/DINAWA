'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { initiales } from '@/lib/format';
import { NotificationToggle, PhotoUploadZone, ChangePasswordCard } from '@/components/ui';
import { PageHeader, Card, CardBody, Label, Input, Button, Badge } from '@/components/ds';

interface UserProfile {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: string;
  city: string | null;
  profilePhotoUrl: string | null;
  accountStatus: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Propriétaire', MANAGER: 'Gestionnaire', TENANT: 'Locataire', ADMIN: 'Administrateur',
};
const STATUS_TONE: Record<string, 'success' | 'error'> = {
  ACTIVE: 'success', SUSPENDED_INACTIVITY: 'error', SUSPENDED_ADMIN: 'error', SUSPENDED_PAYMENT: 'error',
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif', SUSPENDED_INACTIVITY: 'Suspendu (inactivité)', SUSPENDED_ADMIN: 'Suspendu (admin)', SUSPENDED_PAYMENT: 'Suspendu (paiement)',
};

export default function ProfilPage() {
  const { refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile, isLoading: loading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<UserProfile>('/profile'),
  });
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', city: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        phone: profile.phone ?? '',
        city: profile.city ?? '',
      });
    }
  }, [profile]);

  // Aperçu local immédiat (blob:) avant tout envoi réseau — révoqué à chaque
  // remplacement pour ne pas fuir de mémoire.
  useEffect(() => {
    return () => { if (photoPreview) URL.revokeObjectURL(photoPreview); };
  }, [photoPreview]);

  function selectPhoto(files: File[]) {
    const file = files[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const fd = new FormData();
      fd.append('firstName', form.firstName);
      fd.append('lastName', form.lastName);
      if (form.phone) fd.append('phone', form.phone);
      if (form.city) fd.append('city', form.city);
      if (photoFile) fd.append('photo', photoFile);
      await api.patch('/profile', fd);
      setPhotoFile(null);
      if (photoPreview) { URL.revokeObjectURL(photoPreview); setPhotoPreview(null); }
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      refreshProfile();
      setSuccess('Profil mis à jour avec succès');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader title="Mon profil" subtitle="Gérez vos informations personnelles" />

      {loading ? (
        <Card><CardBody><div className="text-center text-muted-foreground py-8">Chargement…</div></CardBody></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
          <Card>
            <CardBody>
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-white font-extrabold text-2xl mb-3" style={{ background: 'linear-gradient(135deg, rgba(10,38,80,1) 0%, rgba(15,76,129,1) 60%, rgba(8,30,65,1) 100%)' }}>
                  {photoPreview || profile?.profilePhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) ou URL signée Supabase temporaire
                    <img src={photoPreview ?? profile!.profilePhotoUrl!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    initiales(profile?.firstName, profile?.lastName)
                  )}
                </div>
                <div className="mb-4 w-full max-w-[220px]">
                  <PhotoUploadZone onSelect={selectPhoto} label={photoFile ? 'Photo sélectionnée' : 'Changer la photo'} multiple={false} />
                </div>
                <div className="font-bold text-lg text-foreground mb-1">{profile?.firstName} {profile?.lastName}</div>
                <div className="text-sm text-muted-foreground mb-3">{profile?.email}</div>
                <div className="flex flex-col gap-2 items-center">
                  <Badge tone="info">{profile ? (ROLE_LABELS[profile.role] ?? profile.role) : '—'}</Badge>
                  {profile && (
                    <Badge tone={STATUS_TONE[profile.accountStatus] ?? 'neutral'}>
                      {STATUS_LABELS[profile.accountStatus] ?? profile.accountStatus}
                    </Badge>
                  )}
                </div>
                {profile?.createdAt && (
                  <div className="mt-4 text-xs text-muted-foreground">
                    Membre depuis {new Date(profile.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <div className="flex flex-col gap-5">
            <Card>
              <CardBody>
                <h2 className="text-base font-bold text-foreground mb-5">Informations personnelles</h2>

                {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600 mb-4">{error}</div>}
                {success && <div className="bg-green-50 border border-green-200 rounded-lg px-3.5 py-2.5 text-sm text-green-700 font-semibold mb-4">✓ {success}</div>}

                <form onSubmit={save} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <Label>Prénom <span className="text-destructive">*</span></Label>
                      <Input className="mt-1.5" required value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Nom <span className="text-destructive">*</span></Label>
                      <Input className="mt-1.5" required value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
                    </div>
                  </div>

                  <div>
                    <Label>Adresse email</Label>
                    <Input className="mt-1.5 bg-ds-secondary text-muted-foreground cursor-not-allowed" value={profile?.email ?? ''} disabled />
                    <p className="text-xs text-muted-foreground mt-1">Contactez le support pour changer votre adresse email.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <Label>Téléphone</Label>
                      <Input className="mt-1.5" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+228 90 00 00 00" />
                    </div>
                    <div>
                      <Label>Ville</Label>
                      <Input className="mt-1.5" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Ex: Lomé" />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button type="submit" loading={saving}>Enregistrer les modifications</Button>
                  </div>
                </form>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <NotificationToggle />
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <ChangePasswordCard />
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

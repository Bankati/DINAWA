'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useApi, TTL } from '@/lib/use-api';
import { useAuth } from '@/lib/auth-context';
import { initiales } from '@/lib/format';
import { PageHeader, Card, CardBody, Field, Input, Button, Badge, NotificationToggle, PhotoUploadZone, ChangePasswordCard } from '@/components/ui';
import { MapPin } from 'lucide-react';

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

export default function LocataireProfilPage() {
  const { refreshProfile } = useAuth();
  const { data: profile, loading, reload } = useApi<UserProfile>('/profile', TTL.STABLE);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', city: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setForm({ firstName: profile.firstName ?? '', lastName: profile.lastName ?? '', phone: profile.phone ?? '', city: profile.city ?? '' });
    }
  }, [profile]);

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
      reload();
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
        <Card><CardBody><div className="text-center text-gray-400 py-8">Chargement…</div></CardBody></Card>
      ) : (
        <div className="flex flex-col gap-5">
          <Card>
            <CardBody>
              <div className="flex items-center gap-5">
                <div className="rounded-full overflow-hidden flex items-center justify-center text-white font-extrabold text-2xl shrink-0" style={{ background: 'linear-gradient(135deg, #0A2650, #0F4C81)', width: 72, height: 72 }}>
                  {photoPreview || profile?.profilePhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) ou URL signée Supabase temporaire
                    <img src={photoPreview ?? profile!.profilePhotoUrl!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    initiales(profile?.firstName, profile?.lastName)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-lg text-gray-900">{profile?.firstName} {profile?.lastName}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{profile?.email}</div>
                  {profile?.city && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" /> {profile.city}
                    </div>
                  )}
                  <div className="max-w-[200px] mt-2.5">
                    <PhotoUploadZone onSelect={selectPhoto} label={photoFile ? 'Sélectionnée' : 'Changer la photo'} multiple={false} />
                  </div>
                </div>
                <Badge tone="info">Locataire</Badge>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="text-base font-bold text-gray-900 mb-5">Modifier mes informations</h2>

              {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600 mb-4">{error}</div>}
              {success && <div className="bg-green-50 border border-green-200 rounded-lg px-3.5 py-2.5 text-sm text-green-700 font-semibold mb-4">✓ {success}</div>}

              <form onSubmit={save} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3.5">
                  <Field label="Prénom" required>
                    <Input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                  </Field>
                  <Field label="Nom" required>
                    <Input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                  </Field>
                </div>
                <Field label="Email (lecture seule)">
                  <Input value={profile?.email ?? ''} disabled className="bg-gray-50 text-gray-400 cursor-not-allowed" />
                </Field>
                <div className="grid grid-cols-2 gap-3.5">
                  <Field label="Téléphone">
                    <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+228 90 00 00 00" />
                  </Field>
                  <Field label="Ville">
                    <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Ex: Lomé" />
                  </Field>
                </div>
                <div className="flex justify-end">
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
      )}
    </div>
  );
}

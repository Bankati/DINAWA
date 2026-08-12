'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { initiales } from '@/lib/format';
import { NotificationToggle, PhotoUploadZone, ChangePasswordCard } from '@/components/ui';
import { PageHeader, Card, CardBody, Label, Input, Button, Badge } from '@/components/ds';
import { Info, MapPin, Phone } from 'lucide-react';

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

export default function GestionnaireProfilPublicPage() {
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
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      refreshProfile();
      setSuccess('Profil mis à jour');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader title="Profil public" subtitle="Vos informations visibles par les propriétaires qui vous confient des biens" />

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 flex items-start gap-2.5">
        <Info className="w-[18px] h-[18px] shrink-0 mt-0.5 text-blue-700" />
        <div className="text-sm text-blue-700">
          Votre <strong>nom</strong>, <strong>téléphone</strong> et <strong>ville</strong> sont affichés aux propriétaires lorsqu&apos;ils vous cherchent pour une délégation.
        </div>
      </div>

      {loading ? (
        <Card><CardBody><div className="text-center text-muted-foreground py-8">Chargement…</div></CardBody></Card>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid gap-6 items-start" style={{ gridTemplateColumns: '280px 1fr' }}>
            <Card>
              <CardBody>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-4">Aperçu public</div>
                <div className="text-center">
                  <div className="rounded-full overflow-hidden flex items-center justify-center text-white font-extrabold text-2xl mx-auto mb-3" style={{ background: 'linear-gradient(135deg, rgba(10,38,80,1) 0%, rgba(15,76,129,1) 60%, rgba(8,30,65,1) 100%)', width: 72, height: 72 }}>
                    {photoPreview || profile?.profilePhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) ou URL signée Supabase temporaire
                      <img src={photoPreview ?? profile!.profilePhotoUrl!} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initiales(profile?.firstName, profile?.lastName)
                    )}
                  </div>
                  <div className="max-w-[180px] mx-auto mb-3">
                    <PhotoUploadZone onSelect={selectPhoto} label={photoFile ? 'Sélectionnée' : 'Changer la photo'} multiple={false} />
                  </div>
                  <div className="font-bold text-base text-foreground">{profile?.firstName} {profile?.lastName}</div>
                  {profile?.city && (
                    <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-3.5 h-3.5" /> {profile.city}
                    </div>
                  )}
                  {profile?.phone && (
                    <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mt-1">
                      <Phone className="w-3.5 h-3.5" /> {profile.phone}
                    </div>
                  )}
                  <div className="mt-3"><Badge tone="info">Gestionnaire</Badge></div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h2 className="text-base font-bold text-foreground mb-5">Modifier mes informations</h2>
                {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600 mb-4">{error}</div>}
                {success && <div className="bg-green-50 border border-green-200 rounded-lg px-3.5 py-2.5 text-sm text-green-700 font-semibold mb-4">✓ {success}</div>}
                <form onSubmit={save} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3.5">
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
                    <Label>Email (lecture seule)</Label>
                    <Input className="mt-1.5 bg-ds-secondary text-muted-foreground cursor-not-allowed" value={profile?.email ?? ''} disabled />
                  </div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <Label>Téléphone</Label>
                      <Input className="mt-1.5" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+228 90 00 00 00" />
                    </div>
                    <div>
                      <Label>Ville</Label>
                      <Input className="mt-1.5" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Ex: Lomé" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" loading={saving}>Enregistrer</Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>

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

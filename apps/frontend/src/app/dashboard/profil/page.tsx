'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { profileApi, type ProfileUser } from '@/lib/profile';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { initiales } from '@/lib/format';
import './page.css';

export default function ProfilPage() {
  const router = useRouter();
  const { logout } = useAuth();

  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [reminderDaysBefore, setReminderDaysBefore] = useState('5');
  const [overdueGraceDays, setOverdueGraceDays] = useState('3');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [pushBusy, setPushBusy] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    profileApi
      .get()
      .then((p) => {
        setProfile(p);
        setFirstName(p.firstName);
        setLastName(p.lastName);
        setReminderDaysBefore(String(p.reminderDaysBefore));
        setOverdueGraceDays(String(p.overdueGraceDays));
      })
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors du chargement du profil'))
      .finally(() => setLoading(false));
  }, []);

  const onPhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const updated = await profileApi.update(
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          reminderDaysBefore: Number(reminderDaysBefore),
          overdueGraceDays: Number(overdueGraceDays),
        },
        photo ?? undefined,
      );
      setProfile(updated);
      setPhoto(null);
      setSuccessMessage('Profil mis à jour');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  const togglePush = async () => {
    if (!profile || pushBusy) return;
    setPushBusy(true);
    setErrorMessage('');
    const nextConsent = profile.notificationConsent === 'ACCEPTED' ? 'DECLINED' : 'ACCEPTED';
    try {
      const updated = await profileApi.updateNotificationConsent(nextConsent);
      setProfile(updated);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors de la mise à jour des notifications');
    } finally {
      setPushBusy(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setErrorMessage('');
    try {
      await profileApi.deleteAccount();
      logout();
      router.push('/');
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors de la suppression du compte');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="prof-page">
        <div className="prof-skeleton" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="prof-page">
        <div className="prof-alert-error">{errorMessage || 'Profil introuvable'}</div>
      </div>
    );
  }

  return (
    <div className="prof-page">
      <div className="prof-header">
        <h1 className="prof-title">Mon profil</h1>
        <p className="prof-subtitle">Gérez vos informations personnelles et vos préférences</p>
      </div>

      {errorMessage && <div className="prof-alert-error">{errorMessage}</div>}
      {successMessage && <div className="prof-alert-success">{successMessage}</div>}

      <form onSubmit={onSave} className="prof-form">
        <div className="prof-card">
          <h2 className="prof-card-title">Photo de profil</h2>
          <div className="prof-photo-row">
            <div className="prof-avatar">
              {photoPreview ? <img src={photoPreview} alt="" /> : initiales(firstName, lastName, 'P')}
            </div>
            <label className="prof-btn-secondary prof-upload-label">
              Changer la photo
              <input type="file" accept="image/*" hidden onChange={onPhotoSelected} />
            </label>
          </div>
          <p className="prof-hint">JPG, PNG — max 5 Mo</p>
        </div>

        <div className="prof-card">
          <h2 className="prof-card-title">Informations personnelles</h2>
          <div className="prof-row">
            <div className="prof-field">
              <label htmlFor="prof-firstname">Prénom</label>
              <input id="prof-firstname" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100} />
            </div>
            <div className="prof-field">
              <label htmlFor="prof-lastname">Nom</label>
              <input id="prof-lastname" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} />
            </div>
          </div>
          <div className="prof-row">
            <div className="prof-field">
              <label>Email</label>
              <p className="prof-readonly">{profile.email ?? '—'}</p>
            </div>
            <div className="prof-field">
              <label>Téléphone</label>
              <p className="prof-readonly">{profile.phone ?? '—'}</p>
            </div>
          </div>
        </div>

        <div className="prof-card">
          <h2 className="prof-card-title">Préférences de rappel</h2>
          <div className="prof-row">
            <div className="prof-field">
              <label htmlFor="prof-reminder">Rappel avant échéance (jours)</label>
              <input id="prof-reminder" type="number" min={1} max={30} value={reminderDaysBefore} onChange={(e) => setReminderDaysBefore(e.target.value)} />
            </div>
            <div className="prof-field">
              <label htmlFor="prof-grace">Délai de grâce avant impayé (jours)</label>
              <input id="prof-grace" type="number" min={0} max={30} value={overdueGraceDays} onChange={(e) => setOverdueGraceDays(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="prof-card">
          <div className="prof-toggle-row">
            <div>
              <h2 className="prof-card-title">Notifications push</h2>
              <p className="prof-hint">Recevez les alertes importantes directement sur votre appareil</p>
            </div>
            <button
              type="button"
              className={`prof-toggle${profile.notificationConsent === 'ACCEPTED' ? ' on' : ''}`}
              onClick={togglePush}
              disabled={pushBusy}
              role="switch"
              aria-checked={profile.notificationConsent === 'ACCEPTED'}
              aria-label="Activer les notifications push"
            >
              <span className="prof-toggle-knob" />
            </button>
          </div>
        </div>

        <div className="prof-form-actions">
          <button type="submit" className="prof-btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>

      <div className="prof-card prof-danger-card">
        <h2 className="prof-card-title">Zone dangereuse</h2>
        <p className="prof-hint">La suppression de votre compte est définitive et anonymise vos données personnelles.</p>
        <button type="button" className="prof-btn-danger" onClick={() => setShowDeleteModal(true)}>Supprimer mon compte</button>
      </div>

      {showDeleteModal && (
        <div className="prof-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="prof-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="prof-modal-title">Supprimer votre compte ?</h2>
            <p className="prof-modal-text">Cette action est irréversible. Vos données personnelles seront anonymisées et vous serez déconnecté.</p>
            <div className="prof-modal-actions">
              <button type="button" className="prof-btn-secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Annuler</button>
              <button type="button" className="prof-btn-danger" onClick={deleteAccount} disabled={deleting}>
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

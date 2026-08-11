'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Field, Input } from './form-field';
import { Button } from './button';
import { toast } from './toast';

// Autosuffisant, sans props — même convention que NotificationToggle.
// Révoque les autres sessions côté backend (voir ProfileController), donc
// aucune action de déconnexion locale nécessaire ici (le token en cours
// d'utilisation reste valide jusqu'à son expiration naturelle).
export function ChangePasswordCard() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas');
      return;
    }

    setSaving(true);
    try {
      await api.patch('/profile/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Mot de passe mis à jour');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="font-semibold text-sm text-gray-900 mb-1">Mot de passe</div>
      <p className="text-xs text-gray-500 mb-4 max-w-sm">
        Changez votre mot de passe — vos autres appareils connectés devront se reconnecter.
      </p>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600 mb-4">{error}</div>}

      <form onSubmit={submit} className="flex flex-col gap-3.5 max-w-sm">
        <Field label="Mot de passe actuel" required>
          <Input
            type="password" required autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
          />
        </Field>
        <Field label="Nouveau mot de passe" required hint="6 caractères minimum">
          <Input
            type="password" required minLength={6} autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
          />
        </Field>
        <Field label="Confirmer le nouveau mot de passe" required>
          <Input
            type="password" required autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
          />
        </Field>
        <div className="flex justify-end pt-1">
          <Button type="submit" loading={saving}>Changer le mot de passe</Button>
        </div>
      </form>
    </div>
  );
}

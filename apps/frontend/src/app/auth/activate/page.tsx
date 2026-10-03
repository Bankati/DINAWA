'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { AuthShell } from '../auth-shell';

export default function ActivatePage() {
  return (
    <Suspense>
      <ActivateForm />
    </Suspense>
  );
}

function ActivateForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const pwMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function onActivate(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Lien d'activation invalide ou expiré.");
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) return;
    if (!acceptedTerms) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/signup/tenant?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message ?? "Lien d'activation invalide ou expiré. Contactez votre propriétaire.",
        );
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="auth-card" style={{ width: '100%' }}>

        {!token && !success && (
          <>
            <div className="lf-head">
              <h1 className="lf-title">Lien invalide</h1>
              <p className="lf-sub">Ce lien d&apos;activation est incorrect ou a expiré.</p>
            </div>
            <p style={{ fontSize: 13.5, color: '#4B5563', lineHeight: 1.7, marginBottom: 24 }}>
              Contactez votre propriétaire ou gestionnaire pour qu&apos;il vous renvoie une invitation.
            </p>
            <Link href="/auth/login" className="lf-back">← Retour à la connexion</Link>
          </>
        )}

        {token && success && (
          <>
            <div className="lf-success">
              <div className="lf-success-icon">
                <CheckCircle2 style={{ width: 28, height: 28 }} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0A2650', marginBottom: 8 }}>Compte activé !</div>
                <div className="lf-success-text">
                  Votre compte locataire est prêt. Connectez-vous avec votre email et le mot de passe que vous venez de choisir.
                </div>
              </div>
            </div>
            <Link
              href="/auth/login"
              className="lf-btn"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', marginTop: 24 }}
            >
              Se connecter
            </Link>
          </>
        )}

        {token && !success && (
          <>
            <div className="lf-head">
              <h1 className="lf-title">Activez votre compte</h1>
              <p className="lf-sub">Choisissez un mot de passe pour accéder à votre espace locataire.</p>
            </div>
            {error && <div className="lf-error-banner-top">{error}</div>}
            <form onSubmit={onActivate} className="lf-form">
              <div className="lf-group">
                <label className="lf-label" htmlFor="password">Mot de passe</label>
                <div className="lf-pw-wrap">
                  <div className="lf-input-icon-wrap" style={{ flex: 1 }}>
                    <span className="lf-input-icon"><Lock className="w-4 h-4" /></span>
                    <input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      className="lf-input"
                      placeholder="Minimum 6 caractères"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="button"
                    className="lf-eye-icon"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="lf-group">
                <label className="lf-label" htmlFor="confirmPw">Confirmer le mot de passe</label>
                <div className="lf-input-icon-wrap">
                  <span className="lf-input-icon"><Lock className="w-4 h-4" /></span>
                  <input
                    id="confirmPw"
                    type={showPw ? 'text' : 'password'}
                    className={`lf-input${pwMismatch ? ' lf-error' : ''}`}
                    placeholder="Répétez le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                {pwMismatch && <span className="lf-err-msg">Les mots de passe ne correspondent pas</span>}
              </div>
              <label className="lf-remember">
                <input
                  type="checkbox"
                  className="lf-check"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span className="lf-check-box" />
                <span>
                  J&apos;accepte les <Link href="/cgu" target="_blank" rel="noopener noreferrer">Conditions Générales d&apos;Utilisation</Link>{' '}
                  et la <Link href="/confidentialite" target="_blank" rel="noopener noreferrer">Politique de confidentialité</Link>
                </span>
              </label>
              <button
                type="submit"
                className="lf-btn"
                disabled={!password || !confirmPassword || pwMismatch || !acceptedTerms || loading}
              >
                {loading ? 'Activation…' : 'Activer mon compte'}
              </button>
            </form>
            <p className="lf-footer">
              <Link href="/auth/login" className="lf-back">← Déjà un compte ? Se connecter</Link>
            </p>
          </>
        )}

      </div>
    </AuthShell>
  );
}

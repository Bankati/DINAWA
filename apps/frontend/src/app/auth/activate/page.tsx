'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { API_URL } from '@/lib/api';

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
    <div className="lp">
      {/* Panneau gauche */}
      <div className="lp-left">
        <div className="lp-left-inner">
          <Link href="/" className="lp-logo">
            <img src="/warah-icon.png" alt="" className="lp-logo-icon" />
            WARAH
          </Link>
          <p className="lp-pitch">Bienvenue sur WARAH ! Activez votre compte locataire en quelques secondes.</p>
          <ul className="lp-list">
            <li>Suivez vos paiements de loyer en temps réel</li>
            <li>Déclarez vos paiements directement depuis l&apos;app</li>
            <li>Accédez à votre quittance PDF à tout moment</li>
          </ul>
        </div>
      </div>

      {/* Panneau droit */}
      <div className="lp-right">
        <div className="lp-form-wrap">

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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 28, height: 28 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
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
                    <input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      className="lf-input"
                      placeholder="Minimum 6 caractères"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button type="button" className="lf-eye" onClick={() => setShowPw((v) => !v)}>
                      {showPw ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                </div>
                <div className="lf-group">
                  <label className="lf-label" htmlFor="confirmPw">Confirmer le mot de passe</label>
                  <input
                    id="confirmPw"
                    type={showPw ? 'text' : 'password'}
                    className={`lf-input${pwMismatch ? ' lf-error' : ''}`}
                    placeholder="Répétez le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  {pwMismatch && <span className="lf-err-msg">Les mots de passe ne correspondent pas</span>}
                </div>
                <button
                  type="submit"
                  className="lf-btn"
                  disabled={!password || !confirmPassword || pwMismatch || loading}
                >
                  {loading ? 'Activation…' : 'Activer mon compte'}
                </button>
              </form>
              <Link href="/auth/login" className="lf-back">← Déjà un compte ? Se connecter</Link>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

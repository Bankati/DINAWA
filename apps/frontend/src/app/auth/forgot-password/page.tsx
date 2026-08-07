'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { API_URL } from '@/lib/api';

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'email' | 'code' | 'success'>(
    searchParams.get('email') ? 'code' : 'email',
  );
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onRequestCode(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Erreur serveur');
      }
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  async function onConfirmReset(e: FormEvent) {
    e.preventDefault();
    if (!code || !newPassword || newPassword !== confirmPassword) return;
    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/password-reset/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Code invalide ou expiré');
      }
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  const pwMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <div className="lp">
      {/* Panneau gauche */}
      <div className="lp-left">
        <div className="lp-left-inner">
          <Link href="/" className="lp-logo">
            <img src="/warah-icon.png" alt="" className="lp-logo-icon" />
            WARAH
          </Link>
          <p className="lp-pitch">Réinitialisez votre mot de passe en toute sécurité.</p>
          <ul className="lp-list">
            <li>Un code à 6 chiffres envoyé à votre adresse email</li>
            <li>Valable 10 minutes, usage unique</li>
            <li>Accès immédiat après réinitialisation</li>
          </ul>
        </div>
      </div>

      {/* Panneau droit */}
      <div className="lp-right">
        <div className="lp-form-wrap">

          {/* ── Succès ── */}
          {step === 'success' && (
            <>
              <div className="lf-success">
                <div className="lf-success-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 28, height: 28 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#0A2650', marginBottom: 8 }}>Mot de passe mis à jour</div>
                  <div className="lf-success-text">Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.</div>
                </div>
              </div>
              <Link href="/auth/login" className="lf-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', marginTop: 24 }}>
                Se connecter
              </Link>
            </>
          )}

          {/* ── Étape 1 : saisie email ── */}
          {step === 'email' && (
            <>
              <div className="lf-head">
                <h1 className="lf-title">Mot de passe oublié</h1>
                <p className="lf-sub">Nous vous enverrons un code à 6 chiffres par email.</p>
              </div>
              {error && <div className="lf-error-banner-top">{error}</div>}
              <form onSubmit={onRequestCode} className="lf-form">
                <div className="lf-group">
                  <label className="lf-label" htmlFor="email">Adresse email</label>
                  <input
                    id="email"
                    type="email"
                    className="lf-input"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="lf-btn" disabled={!email || loading}>
                  {loading ? 'Envoi en cours…' : 'Envoyer le code'}
                </button>
              </form>
              <p className="lf-footer">
                <Link href="/auth/login" className="lf-back">← Retour à la connexion</Link>
              </p>
            </>
          )}

          {/* ── Étape 2 : saisie code + nouveau mot de passe ── */}
          {step === 'code' && (
            <>
              <div className="lf-head">
                <h1 className="lf-title">Nouveau mot de passe</h1>
                <p className="lf-sub">
                  Un code a été envoyé à <strong>{email}</strong>. Entrez-le ci-dessous.
                </p>
              </div>
              {error && <div className="lf-error-banner-top">{error}</div>}
              <form onSubmit={onConfirmReset} className="lf-form">
                <div className="lf-group">
                  <label className="lf-label" htmlFor="code">Code de vérification (6 chiffres)</label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    className="lf-input-otp"
                    placeholder="000000"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                  />
                </div>
                <div className="lf-group">
                  <label className="lf-label" htmlFor="newPw">Nouveau mot de passe</label>
                  <div className="lf-pw-wrap">
                    <input
                      id="newPw"
                      type={showPw ? 'text' : 'password'}
                      className="lf-input"
                      placeholder="Minimum 6 caractères"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                  disabled={!code || code.length < 6 || !newPassword || pwMismatch || loading}
                >
                  {loading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
                </button>
              </form>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13, color: '#9CA3AF' }}>
                <button
                  type="button"
                  className="lf-resend"
                  onClick={() => { setStep('email'); setCode(''); setNewPassword(''); setConfirmPassword(''); setError(''); }}
                >
                  Changer d&apos;adresse email
                </button>
                <span>·</span>
                <button
                  type="button"
                  className="lf-resend"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    setError('');
                    try {
                      await fetch(`${API_URL}/auth/password-reset/request`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email }),
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Renvoyer le code
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

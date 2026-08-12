'use client';

import { Suspense, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ClipboardEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { AuthShell } from '../auth-shell';

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 10 * 60; // aligné sur PASSWORD_RESET_OTP_TTL_MINUTES côté backend (auth.service.ts)

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'email' | 'code' | 'password' | 'success'>(
    searchParams.get('email') ? 'code' : 'email',
  );
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [timerKey, setTimerKey] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const code = otpDigits.join('');
  const codeComplete = code.length === OTP_LENGTH;

  // Minuteur de validité du code — redémarre à chaque arrivée sur l'étape
  // 'code' et à chaque renvoi réussi (timerKey), jamais fabriqué : reflète
  // exactement PASSWORD_RESET_OTP_TTL_MINUTES (10 min) côté backend.
  useEffect(() => {
    if (step !== 'code') return;
    setSecondsLeft(OTP_TTL_SECONDS);
    const interval = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(interval);
  }, [step, timerKey]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, '0');
  const expired = secondsLeft === 0;

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!text) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    text.split('').forEach((c, i) => { next[i] = c; });
    setOtpDigits(next);
    otpRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  }

  async function requestCode() {
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
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function onRequestCode(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    if (await requestCode()) setStep('code');
  }

  async function onResend() {
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    otpRefs.current[0]?.focus();
    if (await requestCode()) setTimerKey((k) => k + 1);
  }

  function onVerifyCode(e: FormEvent) {
    e.preventDefault();
    if (!codeComplete || expired) return;
    // Aucun endpoint de vérification isolée côté backend — le code n'est
    // réellement validé qu'à la confirmation finale (POST .../confirm), qui
    // reçoit code+newPassword ensemble. Cette étape ne fait que le collecter.
    setError('');
    setStep('password');
  }

  async function onConfirmReset(e: FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) return;
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
    <AuthShell>
      <div className="auth-card" style={{ width: '100%' }}>

          {/* ── Succès ── */}
          {step === 'success' && (
            <>
              <div className="lf-success">
                <div className="lf-success-icon">
                  <CheckCircle2 style={{ width: 28, height: 28 }} />
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
                  <div className="lf-input-icon-wrap">
                    <span className="lf-input-icon"><Mail className="w-4 h-4" /></span>
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

          {/* ── Étape 2 : saisie du code OTP (écran dédié) ── */}
          {step === 'code' && (
            <>
              <div className="lf-head">
                <h1 className="lf-title">Vérification du code</h1>
                <p className="lf-sub">
                  Entrez le code envoyé à <strong>{email}</strong>.
                </p>
              </div>
              {error && <div className="lf-error-banner-top">{error}</div>}
              <form onSubmit={onVerifyCode} className="lf-form">
                <div className="lf-group">
                  <label className="lf-label">Code de vérification</label>
                  <div className="otp-boxes">
                    {otpDigits.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className="otp-box"
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={i === 0 ? handleOtpPaste : undefined}
                      />
                    ))}
                  </div>
                  <p className={`otp-timer${expired ? ' expired' : ''}`}>
                    {expired ? 'Code expiré — demandez-en un nouveau.' : <>Code valide pendant <strong>{minutes}:{seconds}</strong></>}
                  </p>
                </div>
                <button type="submit" className="lf-btn" disabled={!codeComplete || expired}>
                  Vérifier le code
                </button>
              </form>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13, color: '#9CA3AF' }}>
                <button
                  type="button"
                  className="lf-resend"
                  onClick={() => { setStep('email'); setOtpDigits(Array(OTP_LENGTH).fill('')); setError(''); }}
                >
                  Changer d&apos;adresse email
                </button>
                <span>·</span>
                <button type="button" className="lf-resend" disabled={loading} onClick={onResend}>
                  Renvoyer le code
                </button>
              </div>
            </>
          )}

          {/* ── Étape 3 : nouveau mot de passe (écran dédié) ── */}
          {step === 'password' && (
            <>
              <div className="lf-head">
                <h1 className="lf-title">Nouveau mot de passe</h1>
                <p className="lf-sub">Définissez votre nouveau mot de passe sécurisé.</p>
              </div>
              {error && <div className="lf-error-banner-top">{error}</div>}
              <form onSubmit={onConfirmReset} className="lf-form">
                <div className="lf-group">
                  <label className="lf-label" htmlFor="newPw">Nouveau mot de passe</label>
                  <div className="lf-pw-wrap">
                    <div className="lf-input-icon-wrap" style={{ flex: 1 }}>
                      <span className="lf-input-icon"><Lock className="w-4 h-4" /></span>
                      <input
                        id="newPw"
                        type={showPw ? 'text' : 'password'}
                        className="lf-input"
                        placeholder="Minimum 6 caractères"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <button type="button" className="lf-eye-icon" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Masquer' : 'Afficher'}>
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
                <button
                  type="submit"
                  className="lf-btn"
                  disabled={!newPassword || pwMismatch || loading}
                >
                  <ShieldCheck className="w-4 h-4" style={{ marginRight: 8, verticalAlign: -3 }} />
                  {loading ? 'Réinitialisation…' : 'Mettre à jour le mot de passe'}
                </button>
              </form>
              <p className="lf-footer">
                <button type="button" className="lf-back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => { setStep('code'); setError(''); }}>
                  ← Modifier le code OTP
                </button>
              </p>
              <p className="lf-footer">
                <Link href="/auth/login" className="lf-back">Retour à la connexion</Link>
              </p>
            </>
          )}

      </div>
    </AuthShell>
  );
}

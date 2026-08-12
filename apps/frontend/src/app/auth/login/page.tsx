'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Zap, LockKeyhole } from 'lucide-react';
import { useAuth, ApiError, roleDefaultRoute } from '@/lib/auth-context';
import { API_URL } from '@/lib/api';
import { AuthShell } from '../auth-shell';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const emailInvalid = emailTouched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    if (auth.isLoggedIn()) {
      // Lu directement depuis localStorage : le contexte React n'a pas
      // forcément fini d'hydrater son state `user` à ce stade du montage.
      try {
        const raw = localStorage.getItem('warah_user');
        const role = raw ? JSON.parse(raw).role : undefined;
        router.replace(roleDefaultRoute(role ?? 'OWNER'));
      } catch {
        // JSON corrompu → on efface et on laisse la page de login s'afficher
        localStorage.removeItem('warah_access_token');
        localStorage.removeItem('warah_refresh_token');
        localStorage.removeItem('warah_user');
      }
      return;
    }
    // /health/ready est exclu du préfixe /api (sonde Railway) → URL directe
    fetch(`${API_URL.replace(/\/api$/, '')}/health/ready`).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    if (!email || !password || emailInvalid) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const loggedInUser = await auth.login(email, password);
      const returnUrl = searchParams.get('returnUrl');
      const dest = returnUrl ?? roleDefaultRoute(loggedInUser.role);
      router.push(dest);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message === 'Invalid login credentials'
            ? 'Email ou mot de passe incorrect'
            : err.message
          : 'Erreur de connexion';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="auth-card" style={{ width: '100%' }}>
        <div className="lf-head">
          <h1 className="lf-title">Connexion</h1>
          <p className="lf-sub">Accédez à votre espace WARAH</p>
        </div>

        <form onSubmit={onLogin} className="lf-form">
          <div className="lf-group">
            <label className="lf-label" htmlFor="email">Adresse email</label>
            <div className="lf-input-icon-wrap">
              <span className="lf-input-icon"><Mail className="w-4 h-4" /></span>
              <input
                id="email"
                type="email"
                className={`lf-input${emailInvalid ? ' lf-error' : ''}`}
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
              />
            </div>
            {emailInvalid && <span className="lf-err-msg">Adresse email invalide</span>}
          </div>

          <div className="lf-group">
            <div className="lf-label-row">
              <label className="lf-label" htmlFor="password">Mot de passe</label>
              <Link href="/auth/forgot-password" className="lf-forgot">Mot de passe oublié</Link>
            </div>
            <div className="lf-input-icon-wrap lf-pw-wrap">
              <span className="lf-input-icon"><Lock className="w-4 h-4" /></span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="lf-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="lf-eye-icon"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <label className="lf-remember">
            <input type="checkbox" className="lf-check" />
            <span className="lf-check-box" />
            <span>Se souvenir de moi</span>
          </label>

          <button type="submit" className="lf-btn" disabled={!email || !password || emailInvalid || isLoading}>
            {isLoading ? 'Connexion…' : 'Se connecter'}
          </button>

          {errorMessage && <div className="lf-error-banner">{errorMessage}</div>}
        </form>

        <div className="lf-trust-row">
          <span className="lf-trust-item"><ShieldCheck />Connexion sécurisée</span>
          <span className="lf-trust-item"><Zap />Accès instantané</span>
          <span className="lf-trust-item"><LockKeyhole />Données protégées</span>
        </div>

        <p className="lf-footer" style={{ marginTop: 24, marginBottom: 0 }}>
          Pas encore inscrit ? <Link href="/auth/register" className="lf-register-link">Créer un compte</Link>
        </p>
      </div>
    </AuthShell>
  );
}

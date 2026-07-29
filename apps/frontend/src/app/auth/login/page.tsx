'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, ApiError, roleDefaultRoute } from '@/lib/auth-context';
import { API_URL } from '@/lib/api';

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
      const raw = localStorage.getItem('warah_user');
      const role = raw ? JSON.parse(raw).role : undefined;
      router.replace(role ? roleDefaultRoute(role) : '/');
      return;
    }
    // /health/ready = @Public(), exécute SELECT 1 → chauffe la connexion
    // TCP ET le pool Prisma pendant que l'utilisateur saisit ses identifiants.
    fetch(`${API_URL}/health/ready`).catch(() => {});
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
    <div className="lp">
      {/* ── Panneau gauche ── */}
      <div className="lp-left">
        <div className="lp-left-inner">
          <Link href="/" className="lp-logo">
            <img src="/warah-icon.png" alt="" className="lp-logo-icon" />
            WARAH
          </Link>

          <p className="lp-pitch">
            Gérez vos biens en toute sérénité. La plateforme pensée pour les propriétaires,
            locataires et gestionnaires immobiliers du Togo.
          </p>

          <ul className="lp-list">
            <li>Gestion multi-biens — villas, appartements, studios</li>
            <li>Paiements T-Money &amp; Flooz encaissés automatiquement</li>
            <li>Alertes impayés en temps réel</li>
            <li>Contrats de bail générés et archivés en PDF</li>
          </ul>

          <div className="lp-stats">
            <span>1 200+ annonces</span>
            <span>500+ propriétaires</span>
            <span>4.9 satisfaction</span>
          </div>
        </div>
      </div>

      {/* ── Panneau droit ── */}
      <div className="lp-right">
        <div className="lp-form-wrap">
          <div className="lf-head">
            <h1 className="lf-title">Connexion</h1>
            <p className="lf-sub">Accédez à votre espace WARAH</p>
          </div>

          <form onSubmit={onLogin} className="lf-form">
            <div className="lf-group">
              <label className="lf-label" htmlFor="email">Adresse email</label>
              <input
                id="email"
                type="email"
                className={`lf-input${emailInvalid ? ' lf-error' : ''}`}
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
              />
              {emailInvalid && <span className="lf-err-msg">Adresse email invalide</span>}
            </div>

            <div className="lf-group">
              <div className="lf-label-row">
                <label className="lf-label" htmlFor="password">Mot de passe</label>
                <Link href="/auth/forgot-password" className="lf-forgot">Mot de passe oublié</Link>
              </div>
              <div className="lf-pw-wrap">
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
                  className="lf-eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Afficher le mot de passe"
                >
                  {showPassword ? 'Masquer' : 'Afficher'}
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

          <p className="lf-footer">
            Pas encore inscrit ? <Link href="/auth/register" className="lf-register-link">Créer un compte</Link>
          </p>

          <Link href="/" className="lf-back">Retour à l&apos;accueil</Link>
        </div>
      </div>
    </div>
  );
}

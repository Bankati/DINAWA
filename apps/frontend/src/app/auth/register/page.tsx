'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { Home, Users, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { PHONE_PREFIXES, matchPrefix, phoneLengthError, phoneIsValid, type PhonePrefix } from '@/lib/phone-prefixes';
import { signupOwner, signupManager } from '@/lib/signup';
import { ApiError } from '@/lib/auth-context';
import { AuthShell } from '../auth-shell';
import './page.css';

type Role = 'OWNER' | 'MANAGER';
type Step = 'role' | 'info' | 'success';

interface InfoForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  city: string;
  residenceCountry: string;
}

const EMPTY_INFO: InfoForm = { firstName: '', lastName: '', email: '', password: '', phone: '', city: '', residenceCountry: '' };

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('role');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [info, setInfo] = useState<InfoForm>(EMPTY_INFO);
  const [touched, setTouched] = useState<Partial<Record<keyof InfoForm, boolean>>>({});

  const [showPassword, setShowPassword] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState<PhonePrefix | null>(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const phoneWrapRef = useRef<HTMLDivElement>(null);

  const stepIndex = { role: 0, info: 1, success: 2 }[step];

  // Ferme le sélecteur de pays au clic extérieur / touche Échap
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!showCountryPicker) return;
      if (phoneWrapRef.current && !phoneWrapRef.current.contains(e.target as Node)) {
        setShowCountryPicker(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowCountryPicker(false);
    }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showCountryPicker]);

  function setField<K extends keyof InfoForm>(key: K, value: InfoForm[K]) {
    setInfo((f) => ({ ...f, [key]: value }));
  }
  function markTouched(key: keyof InfoForm) {
    setTouched((t) => ({ ...t, [key]: true }));
  }

  const firstNameInvalid = touched.firstName && !info.firstName.trim();
  const lastNameInvalid = touched.lastName && !info.lastName.trim();
  const emailInvalid = touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email);
  const passwordInvalid = touched.password && info.password.length < 6;
  const phoneErr = phoneLengthError(info.phone);
  const phoneInvalid = touched.phone && !phoneIsValid(info.phone);
  const cityInvalid = touched.city && !info.city.trim();

  const infoFormValid =
    !!info.firstName.trim() && !!info.lastName.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email) &&
    info.password.length >= 6 &&
    phoneIsValid(info.phone) &&
    !!info.city.trim();

  const filteredPrefixes = (() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return PHONE_PREFIXES;
    return PHONE_PREFIXES.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.includes(q) || p.country.toLowerCase().includes(q),
    );
  })();

  function onPhoneInput(value: string) {
    setField('phone', value);
    const match = matchPrefix(value.trim());
    setDetectedCountry(match);
    if (match) setField('residenceCountry', match.country);
  }

  function toggleCountryPicker(e: React.MouseEvent) {
    e.stopPropagation();
    setShowCountryPicker((v) => !v);
    setCountrySearch('');
  }

  function selectCountry(p: PhonePrefix) {
    const raw = info.phone.trim();
    const localPart = detectedCountry && raw.startsWith(detectedCountry.code)
      ? raw.slice(detectedCountry.code.length).trim()
      : raw.replace(/^\+/, '').replace(/\D/g, '');
    setField('phone', localPart ? `${p.code} ${localPart}` : `${p.code} `);
    setField('residenceCountry', p.country);
    setDetectedCountry(p);
    setShowCountryPicker(false);
    setCountrySearch('');
  }

  function goToInfo() {
    if (selectedRole) setStep('info');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!infoFormValid || !selectedRole) return;
    setIsLoading(true);
    setErrorMessage('');

    const phone = info.phone.replace(/\s+/g, '');

    try {
      if (selectedRole === 'OWNER') {
        await signupOwner({
          email: info.email,
          password: info.password,
          firstName: info.firstName,
          lastName: info.lastName,
          phone,
          city: info.city,
          residenceCountry: info.residenceCountry || 'TG',
        });
      } else {
        await signupManager({
          email: info.email,
          password: info.password,
          firstName: info.firstName,
          lastName: info.lastName,
          phone,
          city: info.city,
        });
      }
      setIsLoading(false);
      setStep('success');
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(err instanceof ApiError ? err.message : 'Une erreur est survenue lors de la création du compte.');
    }
  }

  return (
    <AuthShell maxWidth={520}>
      <div className="auth-card" style={{ width: '100%' }}>
          {step !== 'success' && (
            <div className="mini-steps">
              <span className={`mini-step${step === 'role' ? ' active' : ''}${stepIndex > 0 ? ' done' : ''}`}>1. Rôle</span>
              <span className="mini-step-sep" />
              <span className={`mini-step${step === 'info' ? ' active' : ''}${stepIndex > 1 ? ' done' : ''}`}>2. Informations</span>
            </div>
          )}
          {/* ÉTAPE 1 : Choix du rôle */}
          {step === 'role' && (
            <div className="step-content">
              <h2>Créer votre compte</h2>
              <p className="subtitle">Je suis…</p>
              <div className="role-grid">
                <button type="button" className={`role-card${selectedRole === 'OWNER' ? ' selected' : ''}`} onClick={() => setSelectedRole('OWNER')}>
                  <Home strokeWidth={1.5} />
                  <strong>Propriétaire</strong>
                  <span>Je possède des biens immobiliers au Togo</span>
                </button>
                <button type="button" className={`role-card${selectedRole === 'MANAGER' ? ' selected' : ''}`} onClick={() => setSelectedRole('MANAGER')}>
                  <Users strokeWidth={1.5} />
                  <strong>Gestionnaire</strong>
                  <span>Je gère des biens pour le compte de propriétaires</span>
                </button>
              </div>
              <button className="btn-primary" disabled={!selectedRole} onClick={goToInfo}>
                Continuer
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
              <p className="login-link">Déjà un compte ? <Link href="/auth/login">Se connecter</Link></p>
            </div>
          )}

          {/* ÉTAPE 2 : Informations personnelles */}
          {step === 'info' && (
            <div className="step-content">
              <button className="back-btn" onClick={() => setStep('role')}>← Retour</button>
              <div className="role-badge">
                {selectedRole === 'OWNER' ? <Home className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                <div>
                  <strong>{selectedRole === 'OWNER' ? 'Propriétaire' : 'Gestionnaire'}</strong>
                  <span>{selectedRole === 'OWNER' ? 'Je gère mes biens' : 'Je gère des biens pour un tiers'}</span>
                </div>
              </div>
              <h2>Vos informations</h2>
              <p className="subtitle">{selectedRole === 'OWNER' ? 'Compte propriétaire' : 'Compte gestionnaire immobilier'}</p>
              <form onSubmit={submit} className="form-fields">
                <div className="field-row">
                  <div className="field">
                    <label>Prénom *</label>
                    <input type="text" placeholder="Kofi" value={info.firstName} onChange={(e) => setField('firstName', e.target.value)} onBlur={() => markTouched('firstName')} />
                    {firstNameInvalid && <span className="error">Prénom requis</span>}
                  </div>
                  <div className="field">
                    <label>Nom *</label>
                    <input type="text" placeholder="Mensah" value={info.lastName} onChange={(e) => setField('lastName', e.target.value)} onBlur={() => markTouched('lastName')} />
                    {lastNameInvalid && <span className="error">Nom requis</span>}
                  </div>
                </div>
                <div className="field">
                  <label>Email *</label>
                  <div className="field-icon-wrap">
                    <span className="field-icon"><Mail className="w-4 h-4" /></span>
                    <input type="email" placeholder="kofi@exemple.com" value={info.email} onChange={(e) => setField('email', e.target.value)} onBlur={() => markTouched('email')} />
                  </div>
                  {emailInvalid && <span className="error">Email valide requis</span>}
                </div>
                <div className="field">
                  <label>Mot de passe * <small>(min 6 caractères)</small></label>
                  <div className="field-icon-wrap has-eye">
                    <span className="field-icon"><Lock className="w-4 h-4" /></span>
                    <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={info.password} onChange={(e) => setField('password', e.target.value)} onBlur={() => markTouched('password')} />
                    <button type="button" className="field-eye" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordInvalid && <span className="error">Minimum 6 caractères</span>}
                </div>

                {/* Téléphone avec sélecteur de pays */}
                <div className="field">
                  <label>Téléphone *</label>
                  <div className={`phone-wrap${showCountryPicker ? ' open' : ''}`} ref={phoneWrapRef}>
                    <button type="button" className="phone-prefix" aria-haspopup="listbox" aria-expanded={showCountryPicker} onClick={toggleCountryPicker}>
                      {detectedCountry ? (
                        <img src={`https://flagcdn.com/w40/${detectedCountry.country.toLowerCase()}.png`} alt={detectedCountry.name} className="flag-img" title={`${detectedCountry.name} ${detectedCountry.code}`} />
                      ) : (
                        <svg width="18" height="18" fill="none" stroke="#9ca3af" strokeWidth="1.8" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="2" y1="12" x2="22" y2="12"/>
                          <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
                        </svg>
                      )}
                      <svg className="chevron" width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 4.5l3 3 3-3"/></svg>
                    </button>
                    <input
                      type="tel"
                      placeholder="+228 90 12 34 56"
                      className="phone-input"
                      value={info.phone}
                      onChange={(e) => onPhoneInput(e.target.value)}
                      onFocus={() => setShowCountryPicker(false)}
                      onBlur={() => markTouched('phone')}
                    />

                    {showCountryPicker && (
                      <div className="country-dropdown" role="listbox">
                        <input type="text" className="country-search" placeholder="Rechercher un pays…" value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} autoFocus />
                        <div className="country-list">
                          {filteredPrefixes.length === 0 ? (
                            <div className="country-empty">Aucun pays trouvé</div>
                          ) : (
                            filteredPrefixes.map((p) => (
                              <button key={p.country} type="button" className={`country-item${detectedCountry?.country === p.country ? ' active' : ''}`} onClick={() => selectCountry(p)}>
                                <img src={`https://flagcdn.com/w40/${p.country.toLowerCase()}.png`} alt={p.name} className="flag-img" />
                                <span className="country-name">{p.name}</span>
                                <span className="country-code">{p.code}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {touched.phone && phoneErr ? (
                    <span className="error">
                      {phoneErr.country} : le numéro doit comporter {phoneErr.expected} chiffres après l&apos;indicatif (actuellement {phoneErr.actual})
                    </span>
                  ) : phoneInvalid ? (
                    <span className="error">Numéro de téléphone invalide (ex : +22890123456)</span>
                  ) : null}
                </div>

                <div className="field">
                  <label>Ville de résidence *</label>
                  <input type="text" placeholder="Lomé" value={info.city} onChange={(e) => setField('city', e.target.value)} onBlur={() => markTouched('city')} />
                  {cityInvalid && <span className="error">Ville requise</span>}
                </div>

                <button type="submit" className="btn-primary" disabled={!infoFormValid || isLoading}>
                  {isLoading ? (
                    <>
                      <svg className="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" opacity=".25"/><path d="M12 2a10 10 0 0110 10" opacity=".75"/></svg>
                      Création en cours…
                    </>
                  ) : (
                    <>
                      Créer mon compte
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </>
                  )}
                </button>
                {errorMessage && <div className="error-banner">{errorMessage}</div>}
              </form>
            </div>
          )}

          {/* ÉTAPE 3 : Succès */}
          {step === 'success' && (
            <div className="step-content success-content">
              <div className="success-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
              <h2>Compte créé !</h2>
              <p>Votre compte a été créé avec succès.</p>
              <Link href="/auth/login" className="btn-primary">Se connecter</Link>
            </div>
          )}
      </div>
    </AuthShell>
  );
}

'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import PublicNavbar from '@/components/public-navbar';
import PublicFooter from '@/components/public-footer';
import './page.css';

interface ContactForm {
  nom: string;
  role: string;
  email: string;
  telephone: string;
  ville: string;
  sujet: string;
  message: string;
}

const EMPTY_FORM: ContactForm = { nom: '', role: '', email: '', telephone: '', ville: '', sujet: '', message: '' };

const ROLE_LABELS: Record<string, string> = {
  proprietaire: 'Propriétaire', gestionnaire: 'Gestionnaire immobilier', locataire: 'Locataire', autre: 'Autre',
};
const SUJET_LABELS: Record<string, string> = {
  question: 'Question générale', support: 'Support technique', partenariat: 'Partenariat', presse: 'Presse',
};

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof ContactForm>(key: K, value: ContactForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true); setError('');
    try {
      await api.post('/contact', {
        name: form.nom,
        ...(form.role ? { role: ROLE_LABELS[form.role] ?? form.role } : {}),
        email: form.email,
        ...(form.telephone ? { phone: form.telephone } : {}),
        ...(form.ville ? { city: form.ville } : {}),
        subject: SUJET_LABELS[form.sujet] ?? form.sujet,
        message: form.message,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi — réessayez.");
    } finally {
      setSending(false);
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setSubmitted(false);
    setError('');
  }

  const isValid = form.nom && form.email && form.sujet && form.message;

  return (
    <div className="page">
      <PublicNavbar />

      <section className="contact-section">
        <div className="contact-inner">
          {/* Colonne gauche */}
          <div className="contact-intro">
            <div className="contact-eyebrow"><span className="eyebrow-line" />CONTACT</div>
            <h1 className="contact-title">Une question&nbsp;? <br />Parlons-en<span className="dot">.</span></h1>
            <p className="contact-desc">Propriétaire, gestionnaire, locataire ou simple curieux — décrivez-nous votre besoin, notre équipe vous répond rapidement.</p>

            <div className="contact-direct">
              <span className="contact-direct-label">Ou écrivez-nous directement</span>
              <a href="mailto:contact@warah.tg" className="contact-direct-email">contact@warah.tg</a>
            </div>

            <div className="contact-items">
              <div className="contact-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.02 1.18 2 2 0 012 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                <span>+228 90 00 00 00</span>
              </div>
              <div className="contact-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>Lomé, Togo</span>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div className="contact-card">
            {submitted ? (
              <div className="contact-success">
                <div className="contact-success-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <h3>Message envoyé</h3>
                <p>Merci, {form.nom} ! Notre équipe vous recontacte très vite à {form.email}.</p>
                <button type="button" className="contact-again" onClick={resetForm}>Envoyer un autre message</button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={onSubmit}>
                <div className="cf-row">
                  <div className="cf-field">
                    <label htmlFor="nom">Nom complet</label>
                    <input id="nom" name="nom" type="text" required placeholder="Votre nom" value={form.nom} onChange={(e) => set('nom', e.target.value)} />
                  </div>
                  <div className="cf-field">
                    <label htmlFor="role">Vous êtes <span className="cf-optional">Optionnel</span></label>
                    <select id="role" name="role" value={form.role} onChange={(e) => set('role', e.target.value)}>
                      <option value="">Sélectionner...</option>
                      <option value="proprietaire">Propriétaire</option>
                      <option value="gestionnaire">Gestionnaire immobilier</option>
                      <option value="locataire">Locataire</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                </div>

                <div className="cf-row">
                  <div className="cf-field">
                    <label htmlFor="email">Email</label>
                    <input id="email" name="email" type="email" required placeholder="vous@exemple.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
                  </div>
                  <div className="cf-field">
                    <label htmlFor="telephone">Téléphone <span className="cf-optional">Optionnel</span></label>
                    <input id="telephone" name="telephone" type="tel" placeholder="+228 90 00 00 00" value={form.telephone} onChange={(e) => set('telephone', e.target.value)} />
                  </div>
                </div>

                <div className="cf-row">
                  <div className="cf-field">
                    <label htmlFor="ville">Ville <span className="cf-optional">Optionnel</span></label>
                    <input id="ville" name="ville" type="text" placeholder="Ex : Lomé, Kara..." value={form.ville} onChange={(e) => set('ville', e.target.value)} />
                  </div>
                  <div className="cf-field">
                    <label htmlFor="sujet">Sujet</label>
                    <select id="sujet" name="sujet" required value={form.sujet} onChange={(e) => set('sujet', e.target.value)}>
                      <option value="">Sélectionner...</option>
                      <option value="question">Question générale</option>
                      <option value="support">Support technique</option>
                      <option value="partenariat">Partenariat</option>
                      <option value="presse">Presse</option>
                    </select>
                  </div>
                </div>

                <div className="cf-field">
                  <label htmlFor="message">Votre message</label>
                  <textarea id="message" name="message" required rows={5} placeholder="Décrivez votre demande..." value={form.message} onChange={(e) => set('message', e.target.value)} />
                </div>

                {error && <p className="cf-error">{error}</p>}

                <button type="submit" className="cf-submit" disabled={!isValid || sending}>
                  {sending ? 'Envoi…' : 'Envoyer le message'}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

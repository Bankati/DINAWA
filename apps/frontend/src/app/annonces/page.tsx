'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import PublicNavbar from '@/components/public-navbar';
import PublicFooter from '@/components/public-footer';
import {
  getPublicListings,
  PROPERTY_TYPE_LABELS,
  type PropertyType,
  type PublicListingSummary,
} from '@/lib/listing-public';
import { formatFcfa } from '@/lib/format';
import './page.css';

const PAGE_SIZE = 12;

export default function AnnoncesPage() {
  return (
    <Suspense>
      <AnnoncesPublicView />
    </Suspense>
  );
}

function AnnoncesPublicView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [typeFilter, setTypeFilter] = useState<PropertyType | ''>((searchParams.get('type') as PropertyType) || '');
  const [villeFilter, setVilleFilter] = useState(searchParams.get('ville') || '');
  const [budgetFilter, setBudgetFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('recent');

  const [listings, setListings] = useState<PublicListingSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadListings(p: number) {
    setLoading(true);
    setError(false);
    try {
      const result = await getPublicListings({
        page: p,
        limit: PAGE_SIZE,
        type: typeFilter || undefined,
        city: villeFilter || undefined,
        maxRent: budgetFilter ? +budgetFilter : undefined,
      });
      setListings((prev) => (p === 1 ? result.data : [...prev, ...result.data]));
      setTotal(result.total);
      setPage(result.page);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadListings(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedListings = useMemo(() => {
    const list = [...listings];
    if (sortOrder === 'prix_asc') list.sort((a, b) => a.monthlyRent - b.monthlyRent);
    if (sortOrder === 'prix_desc') list.sort((a, b) => b.monthlyRent - a.monthlyRent);
    return list;
  }, [listings, sortOrder]);

  const canLoadMore = listings.length < total;
  const hasFilters = !!(typeFilter || villeFilter || budgetFilter);

  function onFilter() { loadListings(1); }
  function loadMore() { loadListings(page + 1); }
  function clearFilters() {
    setTypeFilter('');
    setVilleFilter('');
    setBudgetFilter('');
    setTimeout(() => loadListings(1), 0);
  }
  function typeLabel(type: PropertyType) { return PROPERTY_TYPE_LABELS[type]; }
  function viewAnnonce(slug: string) { router.push(`/annonces/${slug}`); }

  return (
    <div className="pub-page">
      <PublicNavbar />

      {/* ── HERO ── */}
      <section className="hero">
        <img src="/happy-man-with-house.jpg.jpeg" alt="Immobilier Lomé Togo" className="hero-bg" style={{ objectPosition: 'center top' }} />
        <div className="hero-ov" />
        <div className="hero-content">
          <h1 className="hero-title">Trouvez votre <span className="hero-title-accent">logement idéal</span> au Togo</h1>

          <div className="filter-wrap">
            <div className="filter-card">
              <div className="filter-row">
                <div className="fg">
                  <label className="fg-label">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l5-7 5 7v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><polyline points="6 16 6 9 10 9 10 16"/></svg>
                    Type de bien
                  </label>
                  <select className="fg-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as PropertyType | '')}>
                    <option value="">Tous les types</option>
                    <option value="VILLA">Villa</option>
                    <option value="APARTMENT">Appartement</option>
                    <option value="STUDIO">Studio</option>
                    <option value="COMMERCIAL">Bureau / Commerce</option>
                  </select>
                </div>
                <div className="fg-divider" />
                <div className="fg">
                  <label className="fg-label">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 1C5.2 1 3 3.2 3 6c0 4 5 9 5 9s5-5 5-9c0-2.8-2.2-5-5-5z"/><circle cx="8" cy="6" r="2"/></svg>
                    Ville
                  </label>
                  <select className="fg-select" value={villeFilter} onChange={(e) => setVilleFilter(e.target.value)}>
                    <option value="">Toutes les villes</option>
                    <option value="Lomé">Lomé</option>
                    <option value="Kara">Kara</option>
                    <option value="Sokodé">Sokodé</option>
                    <option value="Atakpamé">Atakpamé</option>
                    <option value="Kpalimé">Kpalimé</option>
                    <option value="Tsévié">Tsévié</option>
                  </select>
                </div>
                <div className="fg-divider" />
                <div className="fg">
                  <label className="fg-label">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M1 7h14"/></svg>
                    Budget maximum
                  </label>
                  <select className="fg-select" value={budgetFilter} onChange={(e) => setBudgetFilter(e.target.value)}>
                    <option value="">Tous les budgets</option>
                    <option value="75000">— 75 000 FCFA</option>
                    <option value="150000">— 150 000 FCFA</option>
                    <option value="300000">— 300 000 FCFA</option>
                    <option value="500000">— 500 000 FCFA</option>
                  </select>
                </div>
                <button className="fg-btn" onClick={onFilter}>
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M15 15l3.5 3.5"/></svg>
                  Rechercher
                </button>
              </div>
              {hasFilters && (
                <div className="filter-active">
                  <span className="fa-count">{total} résultat{total !== 1 ? 's' : ''}</span>
                  <button className="fa-reset" onClick={clearFilters}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 4L4 12M4 4l8 8"/></svg>
                    Effacer les filtres
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── ANNONCES ── */}
      <section className="listings">
        <div className="listings-head">
          <p className="listings-count">{!loading ? `${total} bien${total !== 1 ? 's' : ''} disponible${total !== 1 ? 's' : ''}` : 'Chargement…'}</p>
          <div className="head-right">
            <select className="sort-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="recent">Plus récents</option>
              <option value="prix_asc">Prix croissant</option>
              <option value="prix_desc">Prix décroissant</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="state-box state-box-error">
            <p className="state-title-error">Impossible de charger les annonces</p>
            <p className="state-desc-error">Une erreur est survenue lors du chargement. Réessayez dans un instant.</p>
          </div>
        ) : loading && listings.length === 0 ? (
          <div className="ann-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div className="sk-card" key={i}>
                <div className="sk-img" />
                <div className="sk-body">
                  <div className="sk-line sk-lg" />
                  <div className="sk-line sk-md" />
                  <div className="sk-line sk-sm" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedListings.length === 0 ? (
          <div className="state-box">
            <svg className="state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
            <h3 className="state-title">Aucun bien trouvé</h3>
            <p className="state-desc">Aucune annonce ne correspond à vos critères de recherche.</p>
            <button className="btn-primary" onClick={clearFilters}>Effacer les filtres</button>
          </div>
        ) : (
          <>
            <div className="ann-grid">
              {sortedListings.map((a, i) => (
                <div key={a.id} style={{ display: 'contents' }}>
                  {i === 3 && (
                    <div className="promo-banner">
                      <img src="/bridge-with-city.jpg" alt="" className="promo-bg" loading="lazy" />
                      <div className="promo-scrim" />
                      <div className="promo-dots" aria-hidden="true">
                        <span className="pd pd-1" /><span className="pd pd-2" /><span className="pd pd-3" /><span className="pd pd-4" />
                      </div>
                      <div className="promo-body">
                        <h3 className="promo-title">Passons à l&apos;action</h3>
                        <p className="promo-sub">Vous êtes propriétaire ? Publiez votre annonce et gérez vos loyers sur WARAH en toute simplicité.</p>
                        <Link href="/auth/register" className="promo-cta">
                          Déposer une annonce
                          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12M11 5l5 5-5 5"/></svg>
                        </Link>
                      </div>
                      <div className="promo-icon">
                        <svg viewBox="0 0 64 64" fill="none">
                          <circle cx="32" cy="32" r="26" fill="rgba(255,255,255,0.06)"/>
                          <circle cx="32" cy="32" r="19" stroke="rgba(201,152,46,0.35)" strokeWidth="1.5"/>
                          <path d="M32 16L48 28v20a2 2 0 01-2 2h-9v-12h-10v12h-9a2 2 0 01-2-2V28z" fill="#C9982E"/>
                        </svg>
                      </div>
                    </div>
                  )}
                  <article
                    className="ann-card"
                    onClick={() => viewAnnonce(a.slug)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        viewAnnonce(a.slug);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                  >
                    <div className="ann-img-wrap">
                      {a.photo ? (
                        <img src={a.photo} alt={`${typeLabel(a.type)} — ${a.neighborhood}`} className="ann-img" loading="lazy" />
                      ) : (
                        <div className="ann-img-placeholder">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                        </div>
                      )}
                      <div className="ann-img-gradient" />
                      <span className="ann-badge-type">{typeLabel(a.type)}</span>
                      <span className="ann-badge-dispo">Disponible</span>
                      <div className="ann-price">
                        {formatFcfa(a.monthlyRent)}<small>/mois</small>
                      </div>
                    </div>
                    <div className="ann-body">
                      <div className="ann-meta">
                        <span className="ann-quartier">
                          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 1a3.5 3.5 0 0 1 3.5 3.5c0 3-3.5 6.5-3.5 6.5S2.5 7.5 2.5 4.5A3.5 3.5 0 0 1 6 1z"/><circle cx="6" cy="4.5" r="1.2"/></svg>
                          {a.neighborhood}, {a.city}
                        </span>
                      </div>
                      <h3 className="ann-title">{typeLabel(a.type)} — {a.neighborhood}</h3>
                      <p className="ann-desc">
                        {a.surfaceArea} m²{a.roomsCount ? ` · ${a.roomsCount} pièce${a.roomsCount > 1 ? 's' : ''}` : ''}
                      </p>
                      <div className="ann-footer">
                        <span className="ann-charges">{a.monthlyCharges ? `+ ${formatFcfa(a.monthlyCharges)} charges` : ''}</span>
                        <button
                          type="button"
                          className="ann-cta"
                          onClick={(e) => {
                            e.stopPropagation();
                            viewAnnonce(a.slug);
                          }}
                        >
                          Voir le bien →
                        </button>
                      </div>
                    </div>
                  </article>
                </div>
              ))}
            </div>

            {canLoadMore && (
              <div className="load-more-wrap">
                <button className="load-more-btn" onClick={loadMore} disabled={loading}>
                  {loading ? 'Chargement…' : 'Voir plus de biens'}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── CTA DE CLÔTURE ── */}
      <section className="closing-cta">
        <img src="/photo-beach-town-view-from.jpg" alt="" className="cc-bg" loading="lazy" />
        <div className="cc-scrim" />
        <div className="cc-dots" aria-hidden="true">
          <span className="pd pd-1" /><span className="pd pd-2" /><span className="pd pd-3" /><span className="pd pd-4" />
        </div>
        <div className="cc-inner">
          <h2 className="cc-title">Propriétaire et gestionnaire immobilier, WARAH est fait pour vous</h2>
          <p className="cc-sub">Publiez vos annonces, gérez vos biens et vos locataires sur WARAH, en toute confiance.</p>
          <div className="cc-actions">
            <Link href="/auth/register" className="cc-btn-primary">Créer un compte gratuitement</Link>
            <Link href="/auth/register" className="cc-btn-ghost">Devenir propriétaire</Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

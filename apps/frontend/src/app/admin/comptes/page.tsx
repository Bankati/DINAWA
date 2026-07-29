'use client';

import { useEffect, useMemo, useState } from 'react';
import { getComptes, changerStatutCompte, type CompteUtilisateur, type RoleUtilisateur } from '@/lib/admin';
import { initiales } from '@/lib/format';
import './page.css';

const ROLE_LABEL: Record<RoleUtilisateur, string> = {
  PROPRIETAIRE: 'Propriétaire',
  LOCATAIRE: 'Locataire',
  GESTIONNAIRE: 'Gestionnaire',
  ADMINISTRATEUR: 'Administrateur',
};

const AVATAR_COLORS: Record<RoleUtilisateur, string> = {
  PROPRIETAIRE: '#0F4C81',
  GESTIONNAIRE: '#C9982E',
  LOCATAIRE: '#1F7A5C',
  ADMINISTRATEUR: '#B5563A',
};

const TABS: { key: string; label: string; roles?: RoleUtilisateur[] }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'proprietaires', label: 'Propriétaires', roles: ['PROPRIETAIRE'] },
  { key: 'gestionnaires', label: 'Gestionnaires', roles: ['GESTIONNAIRE'] },
  { key: 'locataires', label: 'Locataires', roles: ['LOCATAIRE'] },
];

function statusLabel(s: CompteUtilisateur['statut']) {
  if (s === 'ACTIF') return 'Actif';
  if (s === 'SUSPENDU') return 'Suspendu';
  return 'En attente';
}

function initialesCompte(c: CompteUtilisateur) {
  return initiales(c.prenom, c.nom);
}

export default function ComptesPage() {
  const [comptes, setComptes] = useState<CompteUtilisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tous');
  const [search, setSearch] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getComptes()
      .then(setComptes)
      .catch(() => setError('Impossible de charger les comptes. Réessayez plus tard.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const tab = TABS.find((t) => t.key === activeTab);
    let list = comptes;
    if (tab?.roles) list = list.filter((c) => tab.roles!.includes(c.role));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) => `${c.prenom} ${c.nom}`.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.telephone.includes(q),
      );
    }
    return list;
  }, [comptes, activeTab, search]);

  const totalActifs = comptes.filter((c) => c.statut === 'ACTIF').length;

  async function toggleStatut(compte: CompteUtilisateur) {
    const nouveauStatut = compte.statut === 'ACTIF' ? 'SUSPENDU' : 'ACTIF';
    setPendingId(compte.id);
    setError(null);
    try {
      const updated = await changerStatutCompte(compte.id, nouveauStatut);
      setComptes((prev) => prev.map((c) => (c.id === compte.id ? updated : c)));
    } catch {
      setError(`Impossible de changer le statut de ${compte.prenom} ${compte.nom}. Réessayez plus tard.`);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      {error && (
        <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13.5 }}>
          {error}
        </div>
      )}
      <div className="panel">
        <div className="panel-head">
          <h1 className="panel-title">Comptes</h1>
          <div className="panel-actions">
            <div className="search-wrap" style={{ width: 220 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input type="text" className="search-input" placeholder="Rechercher un compte..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button className="btn-solid">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Ajouter un compte
            </button>
          </div>
        </div>

        <div className="tabs-row">
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.key} className={`tab-btn${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="stats-inline">
            Total comptes : <strong>{comptes.length}</strong> · Actifs : <strong>{totalActifs}</strong>
          </div>
        </div>

        <div className="table-wrap">
          <table className="comptes-table">
            <thead>
              <tr>
                <th>Membre</th>
                <th>Téléphone</th>
                <th>Email</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="empty-row"><td colSpan={5}>Chargement…</td></tr>
              ) : filtered.length === 0 ? (
                <tr className="empty-row"><td colSpan={5}>Aucun compte ne correspond à votre recherche.</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="cell-member">
                        <div className="member-avatar" style={{ background: AVATAR_COLORS[c.role] }}>{initialesCompte(c)}</div>
                        <div>
                          <div className="member-name">{c.prenom} {c.nom}</div>
                          <div className="member-role">{ROLE_LABEL[c.role]}</div>
                        </div>
                      </div>
                    </td>
                    <td>{c.telephone}</td>
                    <td>{c.email}</td>
                    <td><span className={`status-badge status-${c.statut.toLowerCase()}`}>{statusLabel(c.statut)}</span></td>
                    <td>
                      <div className="cell-actions">
                        {c.statut !== 'EN_ATTENTE' && (
                          <button
                            className={`pill-toggle ${c.statut === 'ACTIF' ? 'pill-suspendre' : 'pill-activer'}`}
                            onClick={() => toggleStatut(c)}
                            disabled={pendingId === c.id}
                          >
                            {pendingId === c.id ? '…' : c.statut === 'ACTIF' ? 'Suspendre' : 'Activer'}
                          </button>
                        )}
                        <button className="icon-btn icon-btn-danger" aria-label="Supprimer" title="Supprimer">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

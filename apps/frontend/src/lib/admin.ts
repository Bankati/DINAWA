import { api, ApiError } from "./api";

// ── Types pour les vrais endpoints /admin/users ──
export interface AdminUser {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: "OWNER" | "MANAGER" | "TENANT" | "ADMIN";
  accountStatus:
    "ACTIVE" | "SUSPENDED_INACTIVITY" | "SUSPENDED_PAYMENT" | "SUSPENDED_ADMIN";
  city: string | null;
  createdAt: string;
  _count: { ownedProperties: number; leasesAsTenant: number };
}

export interface AdminUserDetail extends AdminUser {
  updatedAt: string;
  failedLoginAttempts: number;
  lockedUntil: string | null;
}

export const adminApi = {
  listUsers: (params?: {
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const qs = params
      ? "?" +
        new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : "";
    return api.get<{
      data: AdminUser[];
      total: number;
      page: number;
      limit: number;
    }>(`/admin/users${qs}`);
  },
  getUser: (id: string) => api.get<AdminUserDetail>(`/admin/users/${id}`),
  deleteUser: (id: string) =>
    api.delete<{ message: string }>(`/admin/users/${id}`),
};

export type RoleUtilisateur =
  "PROPRIETAIRE" | "LOCATAIRE" | "GESTIONNAIRE" | "ADMINISTRATEUR";
export type StatutCompte = "ACTIF" | "SUSPENDU" | "EN_ATTENTE";

export interface CompteUtilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  role: RoleUtilisateur;
  statut: StatutCompte;
  dateInscription: string;
  derniereConnexion?: string;
  nombreBiens?: number;
}

export type StatutTransaction = "REUSSIE" | "EN_ATTENTE" | "ECHOUEE";

export interface TransactionSupervisee {
  id: string;
  reference: string;
  montant: number;
  commission: number;
  modePaiement: "T_MONEY" | "FLOOZ" | "ESPECES";
  statut: StatutTransaction;
  date: string;
  proprietaire: string;
  locataire: string;
  bien: string;
}

export type StatutLitige = "OUVERT" | "EN_COURS" | "RESOLU" | "REJETE";
export type PrioriteLitige = "BASSE" | "MOYENNE" | "HAUTE";

export interface Litige {
  id: string;
  sujet: string;
  description: string;
  statut: StatutLitige;
  priorite: PrioriteLitige;
  plaignant: string;
  misEnCause: string;
  dateOuverture: string;
  dateResolution?: string;
  resolution?: string;
}

export interface RepartitionVille {
  ville: string;
  pourcentage: number;
}

export interface StatistiquesPlateforme {
  nombreUtilisateurs: number;
  nombreProprietaires: number;
  nombreLocataires: number;
  nombreGestionnaires: number;
  nombreBiens: number;
  nombreBiensOccupes: number;
  volumeTransactionsMois: number;
  commissionsMois: number;
  nombreLitigesOuverts: number;
  tauxOccupation: number;
  croissanceUtilisateursMois: number;
  repartitionVilles: RepartitionVille[];
}

// Le backend n'expose pas encore ces routes /admin/* (voir progress-tracker.md
// WARAH — Phase 10 non construite). Comme côté Angular, on retombe sur des
// données mock réalistes en attendant, pour ne pas bloquer le travail visuel.
const MOCK_COMPTES: CompteUtilisateur[] = [
  {
    id: "1",
    nom: "Kouassi",
    prenom: "Jean",
    email: "jean.kouassi@warah.tg",
    telephone: "+228 90 12 34 56",
    role: "PROPRIETAIRE",
    statut: "ACTIF",
    dateInscription: "2026-01-15",
    derniereConnexion: "2026-06-28",
    nombreBiens: 5,
  },
  {
    id: "2",
    nom: "Adjavon",
    prenom: "Akossiwa",
    email: "akossiwa.adjavon@gmail.com",
    telephone: "+228 91 22 33 44",
    role: "LOCATAIRE",
    statut: "ACTIF",
    dateInscription: "2026-02-03",
    derniereConnexion: "2026-06-29",
  },
  {
    id: "3",
    nom: "Mensah",
    prenom: "Komi",
    email: "komi.mensah@warah.tg",
    telephone: "+228 92 33 44 55",
    role: "GESTIONNAIRE",
    statut: "ACTIF",
    dateInscription: "2026-01-20",
    derniereConnexion: "2026-06-27",
    nombreBiens: 18,
  },
  {
    id: "4",
    nom: "Agbodjan",
    prenom: "Yawa",
    email: "yawa.agbodjan@hotmail.com",
    telephone: "+228 93 44 55 66",
    role: "PROPRIETAIRE",
    statut: "SUSPENDU",
    dateInscription: "2026-03-10",
    derniereConnexion: "2026-05-02",
    nombreBiens: 2,
  },
  {
    id: "5",
    nom: "Dossou",
    prenom: "Kossi",
    email: "kossi.dossou@yahoo.fr",
    telephone: "+228 94 55 66 77",
    role: "LOCATAIRE",
    statut: "EN_ATTENTE",
    dateInscription: "2026-06-25",
  },
  {
    id: "6",
    nom: "Tchamie",
    prenom: "Essowavana",
    email: "essowavana.tchamie@warah.tg",
    telephone: "+228 95 66 77 88",
    role: "PROPRIETAIRE",
    statut: "ACTIF",
    dateInscription: "2026-04-12",
    derniereConnexion: "2026-06-29",
    nombreBiens: 9,
  },
  {
    id: "7",
    nom: "Bakoubou",
    prenom: "Rachelle",
    email: "rachelle.bakoubou@gmail.com",
    telephone: "+228 96 77 88 99",
    role: "GESTIONNAIRE",
    statut: "ACTIF",
    dateInscription: "2026-02-18",
    derniereConnexion: "2026-06-30",
    nombreBiens: 12,
  },
  {
    id: "8",
    nom: "Amewou",
    prenom: "David",
    email: "david.amewou@outlook.com",
    telephone: "+228 97 88 99 00",
    role: "LOCATAIRE",
    statut: "ACTIF",
    dateInscription: "2026-05-02",
    derniereConnexion: "2026-06-30",
  },
];

const MOCK_TRANSACTIONS: TransactionSupervisee[] = [
  {
    id: "1",
    reference: "TXN-2026-001245",
    montant: 150000,
    commission: 7500,
    modePaiement: "T_MONEY",
    statut: "REUSSIE",
    date: "2026-06-28",
    proprietaire: "Jean Kouassi",
    locataire: "Akossiwa Adjavon",
    bien: "Appartement 3 chambres Lomé Centre",
  },
  {
    id: "2",
    reference: "TXN-2026-001246",
    montant: 85000,
    commission: 4250,
    modePaiement: "FLOOZ",
    statut: "REUSSIE",
    date: "2026-06-27",
    proprietaire: "Komi Mensah",
    locataire: "Kossi Dossou",
    bien: "Studio Adidogomé",
  },
  {
    id: "3",
    reference: "TXN-2026-001247",
    montant: 200000,
    commission: 10000,
    modePaiement: "T_MONEY",
    statut: "EN_ATTENTE",
    date: "2026-06-29",
    proprietaire: "Essowavana Tchamie",
    locataire: "Yawa Agbodjan",
    bien: "Villa Agoè",
  },
  {
    id: "4",
    reference: "TXN-2026-001248",
    montant: 120000,
    commission: 6000,
    modePaiement: "ESPECES",
    statut: "ECHOUEE",
    date: "2026-06-26",
    proprietaire: "Jean Kouassi",
    locataire: "Kossi Dossou",
    bien: "Appartement 2 chambres Bè",
  },
  {
    id: "5",
    reference: "TXN-2026-001249",
    montant: 95000,
    commission: 4750,
    modePaiement: "FLOOZ",
    statut: "REUSSIE",
    date: "2026-06-25",
    proprietaire: "Komi Mensah",
    locataire: "Akossiwa Adjavon",
    bien: "Studio Tokoin",
  },
];

const MOCK_LITIGES: Litige[] = [
  {
    id: "1",
    sujet: "Caution non remboursée",
    description:
      "Le locataire signale que sa caution n'a pas été remboursée 2 mois après la fin du bail.",
    statut: "OUVERT",
    priorite: "HAUTE",
    plaignant: "Kossi Dossou",
    misEnCause: "Jean Kouassi",
    dateOuverture: "2026-06-20",
  },
  {
    id: "2",
    sujet: "Désaccord sur l'état des lieux",
    description:
      "Litige concernant des dégradations constatées à la sortie du logement.",
    statut: "EN_COURS",
    priorite: "MOYENNE",
    plaignant: "Akossiwa Adjavon",
    misEnCause: "Komi Mensah",
    dateOuverture: "2026-06-15",
  },
  {
    id: "3",
    sujet: "Paiement de loyer contesté",
    description:
      "Le propriétaire affirme ne pas avoir reçu un paiement que le locataire dit avoir effectué.",
    statut: "RESOLU",
    priorite: "HAUTE",
    plaignant: "Yawa Agbodjan",
    misEnCause: "Essowavana Tchamie",
    dateOuverture: "2026-05-28",
    dateResolution: "2026-06-05",
    resolution:
      "Vérification de la transaction T-Money effectuée, paiement confirmé et solde mis à jour.",
  },
  {
    id: "4",
    sujet: "Annonce trompeuse",
    description:
      "Le candidat locataire signale que les photos de l'annonce ne correspondent pas au bien visité.",
    statut: "REJETE",
    priorite: "BASSE",
    plaignant: "Kossi Dossou",
    misEnCause: "Jean Kouassi",
    dateOuverture: "2026-05-10",
    dateResolution: "2026-05-18",
    resolution:
      "Après vérification, les photos correspondaient au bien. Réclamation non fondée.",
  },
];

const MOCK_STATISTIQUES: StatistiquesPlateforme = {
  nombreUtilisateurs: 1284,
  nombreProprietaires: 412,
  nombreLocataires: 798,
  nombreGestionnaires: 74,
  nombreBiens: 956,
  nombreBiensOccupes: 781,
  volumeTransactionsMois: 48650000,
  commissionsMois: 2432500,
  nombreLitigesOuverts: 7,
  tauxOccupation: 81.7,
  croissanceUtilisateursMois: 12.4,
  repartitionVilles: [
    { ville: "Lomé", pourcentage: 64 },
    { ville: "Kara", pourcentage: 14 },
    { ville: "Sokodé", pourcentage: 11 },
    { ville: "Atakpamé", pourcentage: 7 },
    { ville: "Autres", pourcentage: 4 },
  ],
};

// Le mock ne remplace la réponse réelle que si la route n'existe pas encore
// côté backend (404) — jamais sur un 401/403/500, qui doit remonter et être
// affiché comme une vraie erreur, pas être masqué par de fausses données.
function isRouteNotBuilt(e: unknown): boolean {
  return e instanceof ApiError && e.status === 404;
}

export async function getComptes(): Promise<CompteUtilisateur[]> {
  try {
    return await api.get<CompteUtilisateur[]>("/admin/comptes");
  } catch (e) {
    if (isRouteNotBuilt(e)) return MOCK_COMPTES;
    throw e;
  }
}

export async function changerStatutCompte(
  id: string,
  statut: StatutCompte,
): Promise<CompteUtilisateur> {
  return api.patch<CompteUtilisateur>(`/admin/comptes/${id}`, { statut });
}

export async function supprimerCompte(id: string): Promise<void> {
  await api.delete<void>(`/admin/comptes/${id}`);
}

export async function getTransactions(): Promise<TransactionSupervisee[]> {
  try {
    return await api.get<TransactionSupervisee[]>("/admin/transactions");
  } catch (e) {
    if (isRouteNotBuilt(e)) return MOCK_TRANSACTIONS;
    throw e;
  }
}

export async function getLitiges(): Promise<Litige[]> {
  try {
    return await api.get<Litige[]>("/admin/litiges");
  } catch (e) {
    if (isRouteNotBuilt(e)) return MOCK_LITIGES;
    throw e;
  }
}

export async function getStatistiques(): Promise<StatistiquesPlateforme> {
  try {
    return await api.get<StatistiquesPlateforme>("/admin/statistiques");
  } catch (e) {
    if (isRouteNotBuilt(e)) return MOCK_STATISTIQUES;
    throw e;
  }
}

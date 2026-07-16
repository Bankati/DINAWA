import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface Mandat {
  id: string;
  proprietaireNom: string;
  proprietaireTelephone: string;
  bienTitre: string;
  commission: number;
  dateDebut: Date;
  dateFin: Date;
  statut: 'actif' | 'expire' | 'suspendu';
}

export interface MandatRequest {
  proprietaireNom: string;
  proprietaireTelephone: string;
  bienTitre: string;
  commission: number;
  dateDebut: Date;
  dateFin: Date;
}

export interface ProfilReference {
  proprietaire: string;
  bien: string;
}

export interface ProfilGestionnaire {
  id: string;
  prenom: string;
  nom: string;
  specialite: string;
  experience: number;
  description: string;
  tarifs: string;
  telephone?: string;
  email?: string;
  zoneIntervention?: string[];
  verifie?: boolean;
  biensGeres?: number;
  references?: ProfilReference[];
  photo?: string;
}

export interface Rapport {
  id: string;
  titre: string;
  type: string;
  periode: string;
  dateCreation: Date;
  statut: 'genere' | 'envoye' | 'erreur';
}

export interface RapportRequest {
  mois: string;
  annee: string;
  type: string;
  includeDetails: boolean;
}

export interface ExportRequest {
  format: 'pdf' | 'excel';
  type: string;
  dateDebut?: string;
  dateFin?: string;
}

export interface ExportRecord {
  id: string;
  titre: string;
  typeDonnees: string;
  format: string;
  date: Date;
}

@Injectable({ providedIn: 'root' })
export class GestionnaireService {
  private readonly apiUrl = `${environment.apiUrl}/gestionnaire`;

  constructor(private http: HttpClient) {}

  // Portefeuille
  getMandats(): Observable<Mandat[]> {
    return this.http.get<Mandat[]>(`${this.apiUrl}/mandats`);
  }

  ajouterMandat(req: MandatRequest): Observable<Mandat> {
    return this.http.post<Mandat>(`${this.apiUrl}/mandats`, req);
  }

  renouvelerMandat(id: string): Observable<Mandat> {
    return this.http.patch<Mandat>(`${this.apiUrl}/mandats/${id}/renouveler`, {});
  }

  exporterPortefeuille(format: 'pdf' | 'excel'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/mandats/export`, {
      params: { format },
      responseType: 'blob'
    });
  }

  // Profil public
  getProfil(): Observable<ProfilGestionnaire> {
    return this.http.get<ProfilGestionnaire>(`${this.apiUrl}/profil`);
  }

  sauvegarderProfil(profil: Partial<ProfilGestionnaire>): Observable<ProfilGestionnaire> {
    return this.http.put<ProfilGestionnaire>(`${this.apiUrl}/profil`, profil);
  }

  // Rapports
  getRapports(): Observable<Rapport[]> {
    return this.http.get<Rapport[]>(`${this.apiUrl}/rapports`);
  }

  genererRapport(req: RapportRequest): Observable<Rapport> {
    return this.http.post<Rapport>(`${this.apiUrl}/rapports`, req);
  }

  telechargerRapport(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/rapports/${id}/download`, { responseType: 'blob' });
  }

  envoyerRapportParEmail(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/rapports/${id}/envoyer`, {});
  }

  // Export de données
  getExports(): Observable<ExportRecord[]> {
    return this.http.get<ExportRecord[]>(`${this.apiUrl}/exports`);
  }

  exporterDonnees(req: ExportRequest): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/exports`, req, { responseType: 'blob' });
  }

  telechargerExport(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/exports/${id}/download`, { responseType: 'blob' });
  }

  supprimerExport(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/exports/${id}`);
  }
}

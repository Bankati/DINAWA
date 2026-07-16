import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Locataire, StatutLocataire } from '@core/models/locataire.model';
import { environment } from '@env/environment';

export interface LocatairesFilters {
  statut?: StatutLocataire;
  ville?: string;
  recherche?: string;
  bienId?: string;
}

export interface LocataireRequest {
  nom: string;
  prenoms: string;
  email?: string;
  telephone: string;
  adresse: {
    quartier: string;
    ville: string;
    adresseComplete?: string;
  };
  dateNaissance?: Date;
  pieceIdentite: {
    type: 'CNI' | 'PASSEPORT' | 'CARTE_RESIDENCE';
    numero: string;
    dateExpiration?: Date;
  };
  bienId: string;
  dateDebutBail: Date;
  dateFinBail?: Date;
  caution?: number;
  garantNom?: string;
  garantTelephone?: string;
}

@Injectable({ providedIn: 'root' })
export class LocatairesService {
  private readonly apiUrl = `${environment.apiUrl}/locataires`;

  constructor(private http: HttpClient) {}

  getLocataires(filters?: LocatairesFilters): Observable<Locataire[]> {
    let params = new HttpParams();
    if (filters?.statut)    params = params.set('statut', filters.statut);
    if (filters?.ville)     params = params.set('ville', filters.ville);
    if (filters?.recherche) params = params.set('recherche', filters.recherche);
    if (filters?.bienId)    params = params.set('bienId', filters.bienId);
    return this.http.get<Locataire[]>(this.apiUrl, { params });
  }

  getLocataireById(id: string): Observable<Locataire> {
    return this.http.get<Locataire>(`${this.apiUrl}/${id}`);
  }

  createLocataire(locataire: LocataireRequest): Observable<Locataire> {
    return this.http.post<Locataire>(this.apiUrl, locataire);
  }

  updateLocataire(id: string, locataire: Partial<Locataire>): Observable<Locataire> {
    return this.http.put<Locataire>(`${this.apiUrl}/${id}`, locataire);
  }

  deleteLocataire(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  archiveLocataire(id: string): Observable<Locataire> {
    return this.http.patch<Locataire>(`${this.apiUrl}/${id}/archive`, {});
  }

  changerStatut(id: string, statut: StatutLocataire): Observable<Locataire> {
    return this.http.patch<Locataire>(`${this.apiUrl}/${id}/statut`, { statut });
  }

  getStatistiques(): Observable<{ total: number; actifs: number; inactifs: number; enRetard: number }> {
    return this.http.get<any>(`${this.apiUrl}/statistiques`);
  }
}

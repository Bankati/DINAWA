import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Annonce, TypeAnnonce, StatutAnnonce } from '@core/models/annonce.model';
import { environment } from '@env/environment';

export interface AnnonceRequest {
  titre: string;
  description: string;
  type: TypeAnnonce;
  prix: number;
  adresse: {
    quartier: string;
    ville: string;
    adresseComplete?: string;
  };
  bienId: string;
  photos?: string[];
  contact: {
    nom: string;
    telephone: string;
    email?: string;
  };
}

export interface AnnoncesFilters {
  type?: TypeAnnonce;
  statut?: StatutAnnonce;
  ville?: string;
  prixMin?: number;
  prixMax?: number;
  recherche?: string;
}

@Injectable({ providedIn: 'root' })
export class AnnoncesService {
  private readonly apiUrl = `${environment.apiUrl}/annonces`;

  constructor(private http: HttpClient) {}

  getAllAnnonces(): Observable<Annonce[]> {
    return this.http.get<Annonce[]>(this.apiUrl);
  }

  getAnnonceById(id: string): Observable<Annonce> {
    return this.http.get<Annonce>(`${this.apiUrl}/${id}`);
  }

  createAnnonce(annonce: AnnonceRequest): Observable<Annonce> {
    return this.http.post<Annonce>(this.apiUrl, annonce);
  }

  updateAnnonce(id: string, annonce: Partial<Annonce>): Observable<Annonce> {
    return this.http.put<Annonce>(`${this.apiUrl}/${id}`, annonce);
  }

  deleteAnnonce(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  filterAnnonces(filters: AnnoncesFilters): Observable<Annonce[]> {
    let params = new HttpParams();
    if (filters.type)      params = params.set('type', filters.type);
    if (filters.statut)    params = params.set('statut', filters.statut);
    if (filters.ville)     params = params.set('ville', filters.ville);
    if (filters.prixMin)   params = params.set('prixMin', filters.prixMin);
    if (filters.prixMax)   params = params.set('prixMax', filters.prixMax);
    if (filters.recherche) params = params.set('recherche', filters.recherche);
    return this.http.get<Annonce[]>(this.apiUrl, { params });
  }
}

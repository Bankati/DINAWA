import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Locataire } from '@core/models/locataire.model';
import { environment } from '@env/environment';

export interface LocatairesFilters {
  statut?: string;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class LocatairesService {
  private readonly apiUrl = `${environment.apiUrl}/tenants`;

  constructor(private http: HttpClient) {}

  getLocataires(filters?: LocatairesFilters): Observable<Locataire[]> {
    let params = new HttpParams();
    if (filters?.statut) params = params.set('status', filters.statut);
    if (filters?.search) params = params.set('search', filters.search);
    return this.http.get<Locataire[]>(this.apiUrl, { params });
  }

  getLocataireById(id: string): Observable<Locataire> {
    return this.http.get<Locataire>(`${this.apiUrl}/${id}`);
  }
}

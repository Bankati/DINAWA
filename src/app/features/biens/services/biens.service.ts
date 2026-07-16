import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Bien, CreateBienRequest, UpdateBienRequest, PropertyType, PropertyStatus } from '@core/models/bien.model';
import { environment } from '@env/environment';

export interface BiensFilters {
  status?: PropertyStatus;
  type?: PropertyType;
  city?: string;
  minRent?: number;
  maxRent?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BiensStatistiques {
  total: number;
  occupes: number;
  vacants: number;
  tauxOccupation: number;
}

@Injectable({ providedIn: 'root' })
export class BiensService {
  private readonly apiUrl = `${environment.apiUrl}/properties`;

  constructor(private http: HttpClient) {}

  getBiens(filters?: BiensFilters): Observable<{ data: Bien[]; total: number; page: number; limit: number }> {
    let params = new HttpParams();
    if (filters?.status)   params = params.set('status', filters.status);
    if (filters?.type)     params = params.set('type', filters.type);
    if (filters?.city)     params = params.set('city', filters.city);
    if (filters?.minRent)  params = params.set('minRent', filters.minRent);
    if (filters?.maxRent)  params = params.set('maxRent', filters.maxRent);
    if (filters?.search)   params = params.set('search', filters.search);
    if (filters?.page)     params = params.set('page', filters.page);
    if (filters?.limit)    params = params.set('limit', filters.limit ?? 20);
    return this.http.get<{ data: Bien[]; total: number; page: number; limit: number }>(this.apiUrl, { params });
  }

  getBienById(id: string): Observable<Bien> {
    return this.http.get<Bien>(`${this.apiUrl}/${id}`);
  }

  createBien(dto: CreateBienRequest): Observable<Bien> {
    return this.http.post<Bien>(this.apiUrl, dto);
  }

  updateBien(id: string, dto: UpdateBienRequest): Observable<Bien> {
    return this.http.patch<Bien>(`${this.apiUrl}/${id}`, dto);
  }

  // Archivage logique — le backend vérifie l'absence de bail actif avant d'archiver
  deleteBien(id: string): Observable<Bien> {
    return this.http.delete<Bien>(`${this.apiUrl}/${id}`);
  }

  // Photos
  addPhotos(id: string, files: File[]): Observable<{ id: string; url: string; position: number }[]> {
    const formData = new FormData();
    files.forEach((f) => formData.append('photos', f));
    return this.http.post<any[]>(`${this.apiUrl}/${id}/photos`, formData);
  }

  removePhoto(bienId: string, photoId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${bienId}/photos/${photoId}`);
  }

  // Documents (état des lieux, titre de propriété, assurance)
  addDocuments(id: string, type: string, files: File[]): Observable<any[]> {
    const formData = new FormData();
    formData.append('type', type);
    files.forEach((f) => formData.append('documents', f));
    return this.http.post<any[]>(`${this.apiUrl}/${id}/documents`, formData);
  }

  listDocuments(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/documents`);
  }
}

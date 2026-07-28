import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  PaginatedPublicListings,
  PublicListingDetail,
  PublicListingsFilters,
} from '@core/models/listing-public.model';

// Consomme les seules routes publiques réellement exposées par le backend
// (voir /architect module Annonces, 2026-07-28) : GET /public/listings et
// GET /public/listings/:slug — pas de création/édition côté client, la
// publication est automatique à la création/libération d'un bien.
@Injectable({ providedIn: 'root' })
export class PublicListingsService {
  private readonly apiUrl = `${environment.apiUrl}/public/listings`;

  constructor(private readonly http: HttpClient) {}

  getListings(filters: PublicListingsFilters = {}): Observable<PaginatedPublicListings> {
    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page);
    if (filters.limit) params = params.set('limit', filters.limit);
    if (filters.type) params = params.set('type', filters.type);
    if (filters.city) params = params.set('city', filters.city);
    if (filters.neighborhood) params = params.set('neighborhood', filters.neighborhood);
    if (filters.minRent !== undefined) params = params.set('minRent', filters.minRent);
    if (filters.maxRent !== undefined) params = params.set('maxRent', filters.maxRent);
    if (filters.roomsCount !== undefined) params = params.set('roomsCount', filters.roomsCount);
    return this.http.get<PaginatedPublicListings>(this.apiUrl, { params });
  }

  getListingBySlug(slug: string): Observable<PublicListingDetail> {
    return this.http.get<PublicListingDetail>(`${this.apiUrl}/${slug}`);
  }
}

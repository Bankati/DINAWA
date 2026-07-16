import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Bail, CreateBailRequest, TerminateBailRequest, BailAvecLocataire, PaymentFrequency } from '@core/models/locataire.model';

export interface LeaseHistoryEntry extends BailAvecLocataire {}

export interface PaginatedLeaseHistory {
  data: LeaseHistoryEntry[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class BailsService {
  private readonly apiUrl = `${environment.apiUrl}/leases`;
  private readonly propertiesUrl = `${environment.apiUrl}/properties`;

  constructor(private http: HttpClient) {}

  createBail(dto: CreateBailRequest): Observable<Bail> {
    return this.http.post<Bail>(this.apiUrl, dto);
  }

  terminateBail(id: string, dto: TerminateBailRequest): Observable<Bail> {
    return this.http.post<Bail>(`${this.apiUrl}/${id}/terminate`, dto);
  }

  getHistoryByProperty(propertyId: string, page = 1, limit = 20): Observable<PaginatedLeaseHistory> {
    return this.http.get<PaginatedLeaseHistory>(
      `${this.propertiesUrl}/${propertyId}/tenants/history`,
      { params: { page, limit } }
    );
  }

  getHistoryByTenant(tenantUserId: string, page = 1, limit = 20): Observable<PaginatedLeaseHistory> {
    return this.http.get<PaginatedLeaseHistory>(
      `${environment.apiUrl}/tenants/${tenantUserId}/leases/history`,
      { params: { page, limit } }
    );
  }

  getAllLeases(page = 1, limit = 50): Observable<PaginatedLeaseHistory> {
    return this.http.get<PaginatedLeaseHistory>(this.apiUrl, { params: { page, limit } });
  }

  blockTenant(propertyId: string, tenantUserId: string, reason: string): Observable<any> {
    return this.http.post(
      `${this.propertiesUrl}/${propertyId}/tenants/${tenantUserId}/block`,
      { reason }
    );
  }
}

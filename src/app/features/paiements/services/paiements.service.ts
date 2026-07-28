import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  Payment,
  PaginatedPayments,
  ListPaymentsQuery,
  CreateManualPaymentRequest,
  LeaseHistoryEntry,
  PaymentScheduleEntry,
} from '@core/models/payment.model';

interface PaginatedLeaseHistory {
  data: LeaseHistoryEntry[];
  page: number;
  limit: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class PaiementsService {
  private readonly paymentsUrl = `${environment.apiUrl}/payments`;
  private readonly propertiesUrl = `${environment.apiUrl}/properties`;
  private readonly leasesUrl = `${environment.apiUrl}/leases`;

  constructor(private http: HttpClient) {}

  /** GET /payments — historique paginé, filtrable */
  list(query: ListPaymentsQuery = {}): Observable<PaginatedPayments> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<PaginatedPayments>(this.paymentsUrl, { params });
  }

  /** POST /payments/manual — paiement hors plateforme (espèces / virement) */
  createManual(dto: CreateManualPaymentRequest): Observable<Payment> {
    const fd = new FormData();
    fd.append('scheduleEntryId', dto.scheduleEntryId);
    fd.append('paidAmount', String(dto.paidAmount));
    fd.append('paidAt', dto.paidAt);
    fd.append('paymentMethod', dto.paymentMethod);
    if (dto.note) fd.append('note', dto.note);
    if (dto.proof) fd.append('proof', dto.proof);
    return this.http.post<Payment>(`${this.paymentsUrl}/manual`, fd);
  }

  /** POST /payments/:id/confirm — confirme une déclaration locataire */
  confirm(id: string): Observable<Payment> {
    return this.http.post<Payment>(`${this.paymentsUrl}/${id}/confirm`, {});
  }

  /** POST /payments/:id/reject — motif obligatoire */
  reject(id: string, rejectionReason: string): Observable<Payment> {
    return this.http.post<Payment>(`${this.paymentsUrl}/${id}/reject`, { rejectionReason });
  }

  /** GET /payments/:id/receipt.pdf — quittance générée à la volée (PAID uniquement) */
  downloadReceipt(id: string): Observable<Blob> {
    return this.http.get(`${this.paymentsUrl}/${id}/receipt.pdf`, { responseType: 'blob' });
  }

  /** GET /properties/:propertyId/tenants/history — baux d'un bien (pour choisir un locataire/bail) */
  getPropertyLeaseHistory(propertyId: string): Observable<PaginatedLeaseHistory> {
    return this.http.get<PaginatedLeaseHistory>(
      `${this.propertiesUrl}/${propertyId}/tenants/history`,
      { params: { limit: '100' } }
    );
  }

  /** GET /leases/:id/schedule — calendrier complet des échéances d'un bail */
  getLeaseSchedule(leaseId: string): Observable<PaymentScheduleEntry[]> {
    return this.http.get<PaymentScheduleEntry[]>(`${this.leasesUrl}/${leaseId}/schedule`);
  }
}

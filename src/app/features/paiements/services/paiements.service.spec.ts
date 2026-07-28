import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PaiementsService } from './paiements.service';
import { Payment } from '@core/models/payment.model';
import { environment } from '@env/environment';

const PAYMENTS_API = `${environment.apiUrl}/payments`;
const PROPERTIES_API = `${environment.apiUrl}/properties`;
const LEASES_API = `${environment.apiUrl}/leases`;

const paymentMock: Payment = {
  id: 'pay1',
  scheduleEntryId: 'sched1',
  leaseId: 'lease1',
  source: 'MANUAL_OWNER',
  status: 'PAID',
  paymentMethod: 'CASH',
  paidAmount: 150000,
  paidAt: '2026-06-01T00:00:00.000Z',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

describe('PaiementsService', () => {
  let service: PaiementsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PaiementsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PaiementsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('list()', () => {
    it('fait un GET /payments', () => {
      service.list().subscribe();
      const req = http.expectOne((r) => r.url === PAYMENTS_API);
      expect(req.request.method).toBe('GET');
      req.flush({ data: [paymentMock], page: 1, limit: 20, total: 1 });
    });

    it('transmet les filtres en query params', () => {
      service.list({ status: 'PENDING_CONFIRMATION', page: 2 }).subscribe();
      const req = http.expectOne((r) => r.url === PAYMENTS_API);
      expect(req.request.params.get('status')).toBe('PENDING_CONFIRMATION');
      expect(req.request.params.get('page')).toBe('2');
      req.flush({ data: [], page: 2, limit: 20, total: 0 });
    });
  });

  describe('createManual()', () => {
    it('fait un POST multipart /payments/manual', () => {
      service.createManual({
        scheduleEntryId: 'sched1',
        paidAmount: 150000,
        paidAt: '2026-06-01T00:00:00.000Z',
        paymentMethod: 'CASH',
      }).subscribe();
      const req = http.expectOne(`${PAYMENTS_API}/manual`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush(paymentMock);
    });
  });

  describe('confirm()', () => {
    it('fait un POST /payments/:id/confirm', () => {
      service.confirm('pay1').subscribe();
      const req = http.expectOne(`${PAYMENTS_API}/pay1/confirm`);
      expect(req.request.method).toBe('POST');
      req.flush(paymentMock);
    });
  });

  describe('reject()', () => {
    it('fait un POST /payments/:id/reject avec le motif', () => {
      service.reject('pay1', 'Montant incorrect').subscribe();
      const req = http.expectOne(`${PAYMENTS_API}/pay1/reject`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ rejectionReason: 'Montant incorrect' });
      req.flush({ ...paymentMock, status: 'REJECTED' });
    });
  });

  describe('downloadReceipt()', () => {
    it('fait un GET /payments/:id/receipt.pdf en mode blob', () => {
      service.downloadReceipt('pay1').subscribe();
      const req = http.expectOne(`${PAYMENTS_API}/pay1/receipt.pdf`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      req.flush(new Blob());
    });
  });

  describe('getPropertyLeaseHistory()', () => {
    it('fait un GET /properties/:id/tenants/history', () => {
      service.getPropertyLeaseHistory('prop1').subscribe();
      const req = http.expectOne((r) => r.url === `${PROPERTIES_API}/prop1/tenants/history`);
      expect(req.request.method).toBe('GET');
      req.flush({ data: [], page: 1, limit: 100, total: 0 });
    });
  });

  describe('getLeaseSchedule()', () => {
    it('fait un GET /leases/:id/schedule', () => {
      service.getLeaseSchedule('lease1').subscribe();
      const req = http.expectOne(`${LEASES_API}/lease1/schedule`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });
});

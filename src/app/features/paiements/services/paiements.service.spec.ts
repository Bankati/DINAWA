import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PaiementsService, PaiementRequest } from './paiements.service';
import { Paiement, StatutPaiement, FrequencePaiement, ModePaiement } from '@core/models/paiement.model';
import { environment } from '@env/environment';

const API = `${environment.apiUrl}/paiements`;

const paiementMock: Paiement = {
  id: 'pay1',
  bienId: 'b1',
  locataireId: 'l1',
  montant: 150000,
  montantEcheance: 150000,
  frequence: FrequencePaiement.MENSUEL,
  datePaiement: new Date('2025-06-01'),
  dateEcheance: new Date('2025-06-05'),
  statut: StatutPaiement.PAYE,
  modePaiement: ModePaiement.T_MONEY,
  numeroTransaction: 'TM20250601',
};

describe('PaiementsService', () => {
  let service: PaiementsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PaiementsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PaiementsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getPaiements()', () => {
    it('fait un GET /paiements', () => {
      service.getPaiements().subscribe();
      const req = http.expectOne(API);
      expect(req.request.method).toBe('GET');
      req.flush([paiementMock]);
    });

    it('filtre par statut si fourni', () => {
      service.getPaiements({ statut: StatutPaiement.IMPAYE }).subscribe();
      const req = http.expectOne((r) => r.url === API);
      expect(req.request.params.get('statut')).toBe('IMPAYE');
      req.flush([]);
    });
  });

  describe('getPaiementById()', () => {
    it('fait un GET /paiements/:id', (done) => {
      service.getPaiementById('pay1').subscribe((p) => {
        expect(p.id).toBe('pay1');
        done();
      });
      http.expectOne(`${API}/pay1`).flush(paiementMock);
    });
  });

  describe('createPaiement()', () => {
    it('fait un POST /paiements', () => {
      const payload: PaiementRequest = {
        locataireId: 'l1',
        bienId: 'b1',
        montant: 150000,
        montantEcheance: 150000,
        frequence: FrequencePaiement.MENSUEL,
        datePaiement: new Date(),
        dateEcheance: new Date(),
        modePaiement: ModePaiement.T_MONEY,
      };
      service.createPaiement(payload).subscribe();
      const req = http.expectOne(API);
      expect(req.request.method).toBe('POST');
      req.flush(paiementMock);
    });
  });

  describe('deletePaiement()', () => {
    it('fait un DELETE /paiements/:id', () => {
      service.deletePaiement('pay1').subscribe();
      const req = http.expectOne(`${API}/pay1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('getImpayes()', () => {
    it('fait un GET /paiements/impayes', () => {
      service.getImpayes().subscribe();
      const req = http.expectOne(`${API}/impayes`);
      expect(req.request.method).toBe('GET');
      req.flush([paiementMock]);
    });
  });

  describe('envoyerRappel()', () => {
    it('fait un POST /paiements/:id/rappel', () => {
      service.envoyerRappel('pay1').subscribe();
      const req = http.expectOne(`${API}/pay1/rappel`);
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });
  });

  describe('telechargerQuittance()', () => {
    it('fait un GET /paiements/:id/quittance en mode blob', () => {
      service.telechargerQuittance('pay1').subscribe();
      const req = http.expectOne(`${API}/pay1/quittance`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      req.flush(new Blob());
    });
  });

  describe('envoyerQuittanceEmail()', () => {
    it('fait un POST /paiements/:id/quittance/email', () => {
      service.envoyerQuittanceEmail('pay1').subscribe();
      const req = http.expectOne(`${API}/pay1/quittance/email`);
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });
  });
});

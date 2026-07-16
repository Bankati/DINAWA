import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BiensService, BiensFilters } from './biens.service';
import { Bien, TypeBien, StatutBien } from '@core/models/bien.model';
import { environment } from '@env/environment';

const API = `${environment.apiUrl}/biens`;

const bienMock: Bien = {
  id: 'b1',
  titre: 'Villa Lomé Nord',
  typeBien: TypeBien.VILLA,
  statut: StatutBien.VACANT,
  loyer: 150000,
  adresse: { quartier: 'Bé', ville: 'Lomé' },
  surface: 120,
  nbPieces: 3,
  photos: [],
  proprietaireId: 'p1',
  dateCreation: new Date('2025-01-01'),
};

describe('BiensService', () => {
  let service: BiensService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BiensService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(BiensService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getBiens()', () => {
    it('fait un GET /biens', () => {
      service.getBiens().subscribe();
      const req = http.expectOne(API);
      expect(req.request.method).toBe('GET');
      req.flush([bienMock]);
    });

    it('ajoute les filtres comme query params', () => {
      const filters: BiensFilters = { type: TypeBien.VILLA, ville: 'Lomé' };
      service.getBiens(filters).subscribe();
      const req = http.expectOne((r) => r.url === API);
      expect(req.request.params.get('type')).toBe('VILLA');
      expect(req.request.params.get('ville')).toBe('Lomé');
      req.flush([bienMock]);
    });

    it('retourne un tableau de biens', (done) => {
      service.getBiens().subscribe((biens) => {
        expect(biens).toEqual([bienMock]);
        done();
      });
      http.expectOne(API).flush([bienMock]);
    });
  });

  describe('getBienById()', () => {
    it('fait un GET /biens/:id', (done) => {
      service.getBienById('b1').subscribe((bien) => {
        expect(bien.id).toBe('b1');
        done();
      });
      http.expectOne(`${API}/b1`).flush(bienMock);
    });
  });

  describe('createBien()', () => {
    it('fait un POST /biens', () => {
      const payload = { titre: 'Nouveau bien', loyer: 80000 };
      service.createBien(payload).subscribe();
      const req = http.expectOne(API);
      expect(req.request.method).toBe('POST');
      req.flush(bienMock);
    });
  });

  describe('updateBien()', () => {
    it('fait un PUT /biens/:id', () => {
      service.updateBien('b1', { loyer: 160000 }).subscribe();
      const req = http.expectOne(`${API}/b1`);
      expect(req.request.method).toBe('PUT');
      req.flush(bienMock);
    });
  });

  describe('deleteBien()', () => {
    it('fait un DELETE /biens/:id', () => {
      service.deleteBien('b1').subscribe();
      const req = http.expectOne(`${API}/b1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});

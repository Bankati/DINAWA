import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { LocatairesService, LocataireRequest } from './locataires.service';
import { Locataire, StatutLocataire } from '@core/models/locataire.model';
import { environment } from '@env/environment';

const API = `${environment.apiUrl}/locataires`;

const locataireMock = {
  id: 'l1',
  nom: 'Mensah',
  prenoms: 'Kofi',
  email: 'kofi@example.com',
  telephone: '+22890000001',
  adresse: { quartier: 'Tokoin', ville: 'Lomé' },
  pieceIdentite: { type: 'CNI', numero: 'CNI123', dateExpiration: new Date('2030-01-01') },
  bienId: 'b1',
  statut: StatutLocataire.ACTIF,
  dateDebutBail: new Date('2025-01-01'),
  dateNaissance: new Date('1990-06-15'),
  dateCreation: new Date('2025-01-01'),
} as unknown as Locataire;

describe('LocatairesService', () => {
  let service: LocatairesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LocatairesService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(LocatairesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getLocataires()', () => {
    it('fait un GET /locataires', () => {
      service.getLocataires().subscribe();
      const req = http.expectOne(API);
      expect(req.request.method).toBe('GET');
      req.flush([locataireMock]);
    });

    it('filtre par statut et recherche', () => {
      service.getLocataires({ statut: StatutLocataire.ACTIF, recherche: 'Mensah' }).subscribe();
      const req = http.expectOne((r) => r.url === API);
      expect(req.request.params.get('statut')).toBe('ACTIF');
      expect(req.request.params.get('recherche')).toBe('Mensah');
      req.flush([locataireMock]);
    });
  });

  describe('getLocataireById()', () => {
    it('fait un GET /locataires/:id', (done) => {
      service.getLocataireById('l1').subscribe((loc) => {
        expect(loc.id).toBe('l1');
        expect(loc.nom).toBe('Mensah');
        done();
      });
      http.expectOne(`${API}/l1`).flush(locataireMock);
    });
  });

  describe('createLocataire()', () => {
    it('fait un POST /locataires', () => {
      const payload: LocataireRequest = {
        nom: 'Koffi', prenoms: 'Yao',
        telephone: '+22891000002',
        adresse: { quartier: 'Bé', ville: 'Lomé' },
        pieceIdentite: { type: 'CNI', numero: 'CNI456' },
        bienId: 'b1',
        dateDebutBail: new Date('2025-07-01'),
      };
      service.createLocataire(payload).subscribe();
      const req = http.expectOne(API);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.nom).toBe('Koffi');
      req.flush(locataireMock);
    });
  });

  describe('deleteLocataire()', () => {
    it('fait un DELETE /locataires/:id', () => {
      service.deleteLocataire('l1').subscribe();
      const req = http.expectOne(`${API}/l1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('changerStatut()', () => {
    it('fait un PATCH /locataires/:id/statut', () => {
      service.changerStatut('l1', StatutLocataire.INACTIF).subscribe();
      const req = http.expectOne(`${API}/l1/statut`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ statut: 'INACTIF' });
      req.flush({ ...locataireMock, statut: StatutLocataire.INACTIF });
    });
  });
});

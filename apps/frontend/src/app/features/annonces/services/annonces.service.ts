import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Annonce, TypeAnnonce, StatutAnnonce } from '@core/models/annonce.model';

@Injectable({
  providedIn: 'root'
})
export class AnnoncesService {
  private apiUrl = 'http://localhost:3000/api/annonces';

  constructor(private http: HttpClient) {}

  /**
   * Récupère toutes les annonces
   */
  getAllAnnonces(): Observable<Annonce[]> {
    return this.http.get<Annonce[]>(this.apiUrl).pipe(
      catchError(() => of(this.getMockAnnonces()))
    );
  }

  /**
   * Récupère une annonce par son ID
   */
  getAnnonceById(id: string): Observable<Annonce> {
    return this.http.get<Annonce>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => of(this.getMockAnnonces().find(a => a.id === id)!))
    );
  }

  /**
   * Crée une nouvelle annonce
   */
  createAnnonce(annonce: AnnonceRequest): Observable<Annonce> {
    return this.http.post<Annonce>(this.apiUrl, annonce).pipe(
      catchError(() => {
        const newAnnonce: Annonce = {
          id: Date.now().toString(),
          ...annonce,
          photos: annonce.photos || [],
          dateCreation: new Date(),
          dateExpiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          statut: StatutAnnonce.ACTIVE
        };
        return of(newAnnonce);
      })
    );
  }

  /**
   * Met à jour une annonce
   */
  updateAnnonce(id: string, annonce: Partial<Annonce>): Observable<Annonce> {
    return this.http.put<Annonce>(`${this.apiUrl}/${id}`, annonce).pipe(
      catchError(() => {
        const existing = this.getMockAnnonces().find(a => a.id === id);
        if (existing) {
          return of({ ...existing, ...annonce });
        }
        return of(existing!);
      })
    );
  }

  /**
   * Supprime une annonce
   */
  deleteAnnonce(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => of(void 0))
    );
  }

  /**
   * Filtre les annonces selon les critères
   */
  filterAnnonces(filters: AnnoncesFilters): Observable<Annonce[]> {
    return this.getAllAnnonces().pipe(
      map(annonces => {
        return annonces.filter(annonce => {
          if (filters.type && annonce.type !== filters.type) return false;
          if (filters.statut && annonce.statut !== filters.statut) return false;
          if (filters.ville && !annonce.adresse.ville.toLowerCase().includes(filters.ville.toLowerCase())) return false;
          if (filters.prixMin && annonce.prix < filters.prixMin) return false;
          if (filters.prixMax && annonce.prix > filters.prixMax) return false;
          if (filters.recherche) {
            const search = filters.recherche.toLowerCase();
            const matchTitre = annonce.titre.toLowerCase().includes(search);
            const matchVille = annonce.adresse.ville.toLowerCase().includes(search);
            const matchQuartier = annonce.adresse.quartier.toLowerCase().includes(search);
            if (!matchTitre && !matchVille && !matchQuartier) return false;
          }
          return true;
        });
      })
    );
  }

  /**
   * Données mock pour le développement
   */
  private getMockAnnonces(): Annonce[] {
    return [
      {
        id: '1',
        titre: 'Appartement 3 chambres Lomé Centre',
        description: 'Bel appartement de 3 chambres avec salon, cuisine équipée et 2 salles de bain. Proche des commerces et écoles.',
        type: TypeAnnonce.LOCATION,
        typeBien: 'appartement',
        prix: 150000,
        adresse: {
          quartier: 'Centre',
          ville: 'Lomé',
          adresseComplete: 'Rue du Commerce, Lomé'
        },
        bienId: '1',
        photos: [],
        statut: StatutAnnonce.ACTIVE,
        dateCreation: new Date(),
        dateExpiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        contact: {
          nom: 'Kofi Mensah',
          telephone: '+22890123456',
          email: 'kofi.mensah@email.com',
          note: 4.8,
          nombreBiensGeres: 3
        }
      },
      {
        id: '2',
        titre: 'Villa 4 chambres Sokodé',
        description: 'Magnifique villa avec piscine, jardin et garage. Idéale pour une famille.',
        type: TypeAnnonce.VENTE,
        typeBien: 'villa',
        prix: 45000000,
        adresse: {
          quartier: 'Quartier Résidentiel',
          ville: 'Sokodé',
          adresseComplete: 'Avenue des Palmiers, Sokodé'
        },
        bienId: '2',
        photos: [],
        statut: StatutAnnonce.ACTIVE,
        dateCreation: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        dateExpiration: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
        contact: {
          nom: 'Awa Koné',
          telephone: '+22890234567',
          email: 'awa.kone@email.com',
          note: 4.5,
          nombreBiensGeres: 2
        }
      },
      {
        id: '3',
        titre: 'Studio meublé Kara',
        description: 'Studio meublé moderne avec climatisation, internet et eau courante. Proche de l\'université.',
        type: TypeAnnonce.LOCATION,
        typeBien: 'appartement',
        prix: 60000,
        adresse: {
          quartier: 'Quartier Universitaire',
          ville: 'Kara',
          adresseComplete: 'Rue de l\'Université, Kara'
        },
        bienId: '3',
        photos: [],
        statut: StatutAnnonce.ACTIVE,
        dateCreation: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        dateExpiration: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
        contact: {
          nom: 'Yao Koffi',
          telephone: '+22890345678',
          email: 'yao.koffi@email.com',
          note: 5,
          nombreBiensGeres: 1
        }
      },
      {
        id: '4',
        titre: 'Bureau 50m² Kpalimé',
        description: 'Bureau lumineux dans immeuble moderne avec ascenseur et parking.',
        type: TypeAnnonce.LOCATION,
        typeBien: 'bureau',
        prix: 80000,
        adresse: {
          quartier: 'Centre Ville',
          ville: 'Kpalimé',
          adresseComplete: 'Immeuble Business Center, Kpalimé'
        },
        bienId: '4',
        photos: [],
        statut: StatutAnnonce.RESERVEE,
        dateCreation: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        dateExpiration: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        contact: {
          nom: 'Mame Diop',
          telephone: '+22890456789',
          email: 'mame.diop@email.com',
          note: 4.2,
          nombreBiensGeres: 4
        }
      },
      {
        id: '5',
        titre: 'Magasin commercial Lomé',
        description: 'Grand magasin commercial en plein centre-ville avec grande vitrine et stockage.',
        type: TypeAnnonce.VENTE,
        typeBien: 'bureau',
        prix: 25000000,
        adresse: {
          quartier: 'Marché Central',
          ville: 'Lomé',
          adresseComplete: 'Avenue du Marché, Lomé'
        },
        bienId: '5',
        photos: [],
        statut: StatutAnnonce.ACTIVE,
        dateCreation: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
        dateExpiration: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        contact: {
          nom: 'Kouassi Tété',
          telephone: '+22890567890',
          email: 'kouassi.tete@email.com',
          note: 4.6,
          nombreBiensGeres: 2
        }
      }
    ];
  }
}

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

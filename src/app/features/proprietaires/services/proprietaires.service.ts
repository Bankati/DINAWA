import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { Proprietaire, StatutProprietaire } from '@core/models/proprietaire.model';

@Injectable({
  providedIn: 'root'
})
export class ProprietairesService {
  private apiUrl = `${environment.apiUrl}/proprietaires`;

  constructor(private http: HttpClient) {}

  /**
   * Récupère tous les propriétaires
   */
  getAllProprietaires(): Observable<Proprietaire[]> {
    return this.http.get<Proprietaire[]>(this.apiUrl).pipe(
      catchError(() => of(this.getMockProprietaires()))
    );
  }

  /**
   * Récupère un propriétaire par son ID
   */
  getProprietaireById(id: string): Observable<Proprietaire> {
    return this.http.get<Proprietaire>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => of(this.getMockProprietaires().find(p => p.id === id)!))
    );
  }

  /**
   * Crée un nouveau propriétaire
   */
  createProprietaire(proprietaire: ProprietaireRequest): Observable<Proprietaire> {
    return this.http.post<Proprietaire>(this.apiUrl, proprietaire).pipe(
      catchError(() => {
        const newProprietaire: Proprietaire = {
          id: Date.now().toString(),
          ...proprietaire,
          statut: StatutProprietaire.ACTIF,
          dateCreation: new Date(),
          nbBiens: 0
        };
        return of(newProprietaire);
      })
    );
  }

  /**
   * Met à jour un propriétaire
   */
  updateProprietaire(id: string, proprietaire: Partial<Proprietaire>): Observable<Proprietaire> {
    return this.http.put<Proprietaire>(`${this.apiUrl}/${id}`, proprietaire).pipe(
      catchError(() => {
        const existing = this.getMockProprietaires().find(p => p.id === id);
        if (existing) {
          return of({ ...existing, ...proprietaire });
        }
        return of(existing!);
      })
    );
  }

  /**
   * Supprime un propriétaire
   */
  deleteProprietaire(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => of(void 0))
    );
  }

  /**
   * Filtre les propriétaires selon les critères
   */
  filterProprietaires(filters: ProprietairesFilters): Observable<Proprietaire[]> {
    return this.getAllProprietaires().pipe(
      map(proprietaires => {
        return proprietaires.filter(proprietaire => {
          if (filters.statut && proprietaire.statut !== filters.statut) return false;
          if (filters.ville && !proprietaire.adresse.ville.toLowerCase().includes(filters.ville.toLowerCase())) return false;
          if (filters.recherche) {
            const search = filters.recherche.toLowerCase();
            const matchNom = proprietaire.nom.toLowerCase().includes(search);
            const matchPrenoms = proprietaire.prenoms.toLowerCase().includes(search);
            const matchEmail = proprietaire.email?.toLowerCase().includes(search);
            const matchTelephone = proprietaire.telephone.includes(search);
            if (!matchNom && !matchPrenoms && !matchEmail && !matchTelephone) return false;
          }
          return true;
        });
      })
    );
  }

  /**
   * Données mock pour le développement
   */
  private getMockProprietaires(): Proprietaire[] {
    return [
      {
        id: '1',
        nom: 'Mensa',
        prenoms: 'Kofi',
        email: 'kofi.mensah@email.com',
        telephone: '+22890123456',
        adresse: {
          quartier: 'Centre',
          ville: 'Lomé',
          adresseComplete: 'Rue du Commerce, Lomé'
        },
        pieceIdentite: {
          type: 'CNI',
          numero: '1234567890123',
          dateExpiration: new Date('2028-12-31')
        },
        statut: StatutProprietaire.ACTIF,
        nbBiens: 3,
        dateCreation: new Date('2024-01-15')
      },
      {
        id: '2',
        nom: 'Koné',
        prenoms: 'Awa',
        email: 'awa.kone@email.com',
        telephone: '+22890234567',
        adresse: {
          quartier: 'Quartier Résidentiel',
          ville: 'Sokodé',
          adresseComplete: 'Avenue des Palmiers, Sokodé'
        },
        pieceIdentite: {
          type: 'PASSEPORT',
          numero: 'P987654321',
          dateExpiration: new Date('2027-06-30')
        },
        statut: StatutProprietaire.ACTIF,
        nbBiens: 2,
        dateCreation: new Date('2024-02-20')
      },
      {
        id: '3',
        nom: 'Koffi',
        prenoms: 'Yao',
        email: 'yao.koffi@email.com',
        telephone: '+22890345678',
        adresse: {
          quartier: 'Quartier Universitaire',
          ville: 'Kara',
          adresseComplete: 'Rue de l\'Université, Kara'
        },
        pieceIdentite: {
          type: 'CARTE_RESIDENCE',
          numero: 'CR456789012',
          dateExpiration: new Date('2026-09-15')
        },
        statut: StatutProprietaire.ACTIF,
        nbBiens: 1,
        dateCreation: new Date('2024-03-10')
      },
      {
        id: '4',
        nom: 'Diop',
        prenoms: 'Mame',
        email: 'mame.diop@email.com',
        telephone: '+22890456789',
        adresse: {
          quartier: 'Centre Ville',
          ville: 'Kpalimé',
          adresseComplete: 'Immeuble Business Center, Kpalimé'
        },
        pieceIdentite: {
          type: 'CNI',
          numero: '9876543210123',
          dateExpiration: new Date('2029-03-20')
        },
        statut: StatutProprietaire.INACTIF,
        nbBiens: 1,
        dateCreation: new Date('2024-04-05')
      },
      {
        id: '5',
        nom: 'Tété',
        prenoms: 'Kouassi',
        email: 'kouassi.tete@email.com',
        telephone: '+22890567890',
        adresse: {
          quartier: 'Marché Central',
          ville: 'Lomé',
          adresseComplete: 'Avenue du Marché, Lomé'
        },
        pieceIdentite: {
          type: 'PASSEPORT',
          numero: 'P123456789',
          dateExpiration: new Date('2027-11-25')
        },
        statut: StatutProprietaire.ACTIF,
        nbBiens: 4,
        dateCreation: new Date('2024-05-12')
      }
    ];
  }
}

export interface ProprietaireRequest {
  nom: string;
  prenoms: string;
  email?: string;
  telephone: string;
  adresse: {
    quartier: string;
    ville: string;
    adresseComplete?: string;
  };
  pieceIdentite: {
    type: 'CNI' | 'PASSEPORT' | 'CARTE_RESIDENCE';
    numero: string;
    dateExpiration?: Date;
  };
}

export interface ProprietairesFilters {
  statut?: StatutProprietaire;
  ville?: string;
  recherche?: string;
}

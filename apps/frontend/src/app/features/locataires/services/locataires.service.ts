import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Locataire, StatutLocataire } from '@core/models/locataire.model';

export interface LocatairesFilters {
  statut?: StatutLocataire;
  ville?: string;
  recherche?: string;
  bienId?: string;
}

export interface LocataireRequest {
  nom: string;
  prenoms: string;
  email?: string;
  telephone: string;
  adresse: {
    quartier: string;
    ville: string;
    adresseComplete?: string;
  };
  dateNaissance?: Date;
  pieceIdentite: {
    type: 'CNI' | 'PASSEPORT' | 'CARTE_RESIDENCE';
    numero: string;
    dateExpiration?: Date;
  };
  bienId: string;
  dateDebutBail: Date;
  dateFinBail?: Date;
  caution?: number;
  garantNom?: string;
  garantTelephone?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocatairesService {
  private apiUrl = 'http://localhost:3000/api/locataires';

  constructor(private http: HttpClient) {}

  /**
   * Récupère tous les locataires avec filtres optionnels
   */
  getLocataires(filters?: LocatairesFilters): Observable<Locataire[]> {
    let url = this.apiUrl;
    
    if (filters) {
      const params = new URLSearchParams();
      if (filters.statut) params.append('statut', filters.statut);
      if (filters.ville) params.append('ville', filters.ville);
      if (filters.recherche) params.append('recherche', filters.recherche);
      if (filters.bienId) params.append('bienId', filters.bienId);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    return this.http.get<Locataire[]>(url).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la récupération des locataires:', error);
        return of(this.getMockLocataires());
      })
    );
  }

  /**
   * Récupère un locataire par son ID
   */
  getLocataireById(id: string): Observable<Locataire> {
    return this.http.get<Locataire>(`${this.apiUrl}/${id}`).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la récupération du locataire:', error);
        const mockLocataire = this.getMockLocataires().find(l => l.id === id);
        return of(mockLocataire || this.getMockLocataires()[0]);
      })
    );
  }

  /**
   * Crée un nouveau locataire
   */
  createLocataire(locataire: LocataireRequest): Observable<Locataire> {
    return this.http.post<Locataire>(this.apiUrl, locataire).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la création du locataire:', error);
        const newLocataire: Locataire = {
          id: Math.random().toString(36).substr(2, 9),
          nom: locataire.nom,
          prenoms: locataire.prenoms,
          email: locataire.email,
          telephone: locataire.telephone,
          adresse: locataire.adresse,
          dateNaissance: locataire.dateNaissance,
          pieceIdentite: locataire.pieceIdentite,
          bienId: locataire.bienId,
          dateDebutBail: locataire.dateDebutBail,
          dateFinBail: locataire.dateFinBail,
          caution: locataire.caution,
          garantNom: locataire.garantNom,
          garantTelephone: locataire.garantTelephone,
          statut: StatutLocataire.ACTIF,
          dateCreation: new Date()
        };
        return of(newLocataire);
      })
    );
  }

  /**
   * Met à jour un locataire existant
   */
  updateLocataire(id: string, locataire: Partial<Locataire>): Observable<Locataire> {
    return this.http.put<Locataire>(`${this.apiUrl}/${id}`, locataire).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la mise à jour du locataire:', error);
        const existing = this.getMockLocataires().find(l => l.id === id);
        if (existing) {
          const updatedLocataire: Locataire = { ...existing, ...locataire };
          return of(updatedLocataire);
        }
        return of();
      })
    );
  }

  /**
   * Supprime un locataire
   */
  deleteLocataire(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la suppression du locataire:', error);
        return of();
      })
    );
  }

  /**
   * Archive un locataire
   */
  archiveLocataire(id: string): Observable<Locataire> {
    return this.http.patch<Locataire>(`${this.apiUrl}/${id}/archive`, {}).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de l\'archivage du locataire:', error);
        return of();
      })
    );
  }

  /**
   * Change le statut d'un locataire
   */
  changerStatut(id: string, statut: StatutLocataire): Observable<Locataire> {
    return this.http.patch<Locataire>(`${this.apiUrl}/${id}/statut`, { statut }).pipe(
      catchError((error: any) => {
        console.error('Erreur lors du changement de statut:', error);
        return of();
      })
    );
  }

  /**
   * Récupère les statistiques des locataires
   */
  getStatistiques(): Observable<{
    total: number;
    actifs: number;
    inactifs: number;
    enRetard: number;
  }> {
    return this.http.get<any>(`${this.apiUrl}/statistiques`).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la récupération des statistiques:', error);
        return of(this.getMockStatistiques());
      })
    );
  }

  // Données mockées pour le développement
  private getMockLocataires(): Locataire[] {
    return [
      {
        id: '1',
        nom: 'Mensah',
        prenoms: 'Kofi',
        email: 'kofi.mensah@email.com',
        telephone: '+228 90 00 00 01',
        adresse: {
          quartier: 'Centre',
          ville: 'Lomé',
          adresseComplete: '123 Rue de la Paix, Lomé'
        },
        dateNaissance: new Date('1985-05-15'),
        pieceIdentite: {
          type: 'CNI',
          numero: '1234567890123',
          dateExpiration: new Date('2030-05-15')
        },
        bienId: '1',
        dateDebutBail: new Date('2024-01-01'),
        dateFinBail: new Date('2025-01-01'),
        caution: 200000,
        garantNom: 'Yao Mensah',
        garantTelephone: '+228 91 00 00 01',
        statut: StatutLocataire.ACTIF,
        dateCreation: new Date('2024-01-01')
      },
      {
        id: '2',
        nom: 'Kouassi',
        prenoms: 'Awa',
        email: 'awa.kouassi@email.com',
        telephone: '+228 90 00 00 02',
        adresse: {
          quartier: 'Avenue des Martyrs',
          ville: 'Sokodé',
          adresseComplete: '45 Avenue des Martyrs, Sokodé'
        },
        dateNaissance: new Date('1990-08-20'),
        pieceIdentite: {
          type: 'PASSEPORT',
          numero: 'P1234567',
          dateExpiration: new Date('2028-08-20')
        },
        bienId: '2',
        dateDebutBail: new Date('2024-02-01'),
        dateFinBail: new Date('2025-02-01'),
        caution: 300000,
        statut: StatutLocataire.ACTIF,
        dateCreation: new Date('2024-02-01')
      },
      {
        id: '3',
        nom: 'Agbogba',
        prenoms: 'Yao',
        email: 'yao.agbogba@email.com',
        telephone: '+228 90 00 00 03',
        adresse: {
          quartier: 'Rue du Commerce',
          ville: 'Kara',
          adresseComplete: '78 Rue du Commerce, Kara'
        },
        dateNaissance: new Date('1988-03-10'),
        pieceIdentite: {
          type: 'CNI',
          numero: '9876543210987',
          dateExpiration: new Date('2029-03-10')
        },
        bienId: '3',
        dateDebutBail: new Date('2024-03-01'),
        dateFinBail: new Date('2025-03-01'),
        caution: 150000,
        statut: StatutLocataire.EN_RETARD,
        dateCreation: new Date('2024-03-01')
      },
      {
        id: '4',
        nom: 'Togbe',
        prenoms: 'Mawunyo',
        email: 'mawunyo.togbe@email.com',
        telephone: '+228 90 00 00 04',
        adresse: {
          quartier: 'Zone Industrielle',
          ville: 'Kpalimé',
          adresseComplete: '12 Zone Industrielle, Kpalimé'
        },
        dateNaissance: new Date('1992-11-25'),
        pieceIdentite: {
          type: 'CARTE_RESIDENCE',
          numero: 'CR456789',
          dateExpiration: new Date('2027-11-25')
        },
        bienId: '4',
        dateDebutBail: new Date('2024-04-01'),
        dateFinBail: new Date('2025-04-01'),
        caution: 250000,
        statut: StatutLocataire.ACTIF,
        dateCreation: new Date('2024-04-01')
      },
      {
        id: '5',
        nom: 'Amouzou',
        prenoms: 'Komla',
        email: 'komla.amouzou@email.com',
        telephone: '+228 90 00 00 05',
        adresse: {
          quartier: 'Grand Marché',
          ville: 'Lomé',
          adresseComplete: '56 Grand Marché, Lomé'
        },
        dateNaissance: new Date('1987-07-08'),
        pieceIdentite: {
          type: 'CNI',
          numero: '5678901234567',
          dateExpiration: new Date('2031-07-08')
        },
        bienId: '5',
        dateDebutBail: new Date('2024-05-01'),
        dateFinBail: new Date('2025-05-01'),
        caution: 400000,
        statut: StatutLocataire.INACTIF,
        dateCreation: new Date('2024-05-01')
      }
    ];
  }

  private getMockStatistiques() {
    const locataires = this.getMockLocataires();
    return {
      total: locataires.length,
      actifs: locataires.filter(l => l.statut === StatutLocataire.ACTIF).length,
      inactifs: locataires.filter(l => l.statut === StatutLocataire.INACTIF).length,
      enRetard: locataires.filter(l => l.statut === StatutLocataire.EN_RETARD).length
    };
  }
}

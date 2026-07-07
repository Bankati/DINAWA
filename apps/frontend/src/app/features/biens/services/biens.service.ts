import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Bien, TypeBien, StatutBien } from '@core/models/bien.model';

export interface BiensFilters {
  type?: TypeBien;
  statut?: StatutBien;
  ville?: string;
  prixMin?: number;
  prixMax?: number;
  recherche?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BiensService {
  private apiUrl = 'http://localhost:3000/api/biens';

  constructor(private http: HttpClient) {}

  /**
   * Récupère tous les biens avec filtres optionnels
   */
  getBiens(filters?: BiensFilters): Observable<Bien[]> {
    let url = this.apiUrl;
    
    if (filters) {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.statut) params.append('statut', filters.statut);
      if (filters.ville) params.append('ville', filters.ville);
      if (filters.prixMin) params.append('prixMin', filters.prixMin.toString());
      if (filters.prixMax) params.append('prixMax', filters.prixMax.toString());
      if (filters.recherche) params.append('recherche', filters.recherche);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    return this.http.get<Bien[]>(url).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la récupération des biens:', error);
        return of(this.getMockBiens());
      })
    );
  }

  /**
   * Récupère un bien par son ID
   */
  getBienById(id: string): Observable<Bien> {
    return this.http.get<Bien>(`${this.apiUrl}/${id}`).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la récupération du bien:', error);
        const mockBien = this.getMockBiens().find(b => b.id === id);
        return of(mockBien || this.getMockBiens()[0]);
      })
    );
  }

  /**
   * Crée un nouveau bien
   */
  createBien(bien: Partial<Bien> | FormData): Observable<Bien> {
    return this.http.post<Bien>(this.apiUrl, bien).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la création du bien:', error);
        const bienData = bien as Bien;
        const newBien: Bien = {
          id: Math.random().toString(36).substr(2, 9),
          titre: bienData.titre || '',
          proprietaireId: bienData.proprietaireId || 'mock-prop-1',
          typeBien: bienData.typeBien,
          statut: bienData.statut || StatutBien.VACANT,
          adresse: bienData.adresse || { quartier: '', ville: '' },
          surface: bienData.surface || 0,
          nbPieces: bienData.nbPieces || 0,
          loyer: bienData.loyer || 0,
          photos: bienData.photos || [],
          dateCreation: new Date(),
          description: bienData.description,
          locataireActuelId: bienData.locataireActuelId,
          charges: bienData.charges
        };
        return of(newBien);
      })
    );
  }

  /**
   * Met à jour un bien existant
   */
  updateBien(id: string, bien: Partial<Bien> | FormData): Observable<Bien> {
    return this.http.put<Bien>(`${this.apiUrl}/${id}`, bien).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la mise à jour du bien:', error);
        const bienData = bien as Bien;
        const updatedBien: Bien = {
          id,
          titre: bienData.titre || '',
          proprietaireId: bienData.proprietaireId || 'mock-prop-1',
          typeBien: bienData.typeBien,
          statut: bienData.statut || StatutBien.VACANT,
          adresse: bienData.adresse || { quartier: '', ville: '' },
          surface: bienData.surface || 0,
          nbPieces: bienData.nbPieces || 0,
          loyer: bienData.loyer || 0,
          photos: bienData.photos || [],
          dateCreation: bienData.dateCreation || new Date(),
          description: bienData.description,
          locataireActuelId: bienData.locataireActuelId,
          charges: bienData.charges
        };
        return of(updatedBien);
      })
    );
  }

  /**
   * Supprime un bien
   */
  deleteBien(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la suppression du bien:', error);
        return of();
      })
    );
  }

  /**
   * Archive un bien
   */
  archiveBien(id: string): Observable<Bien> {
    return this.http.patch<Bien>(`${this.apiUrl}/${id}/archive`, {}).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de l\'archivage du bien:', error);
        return of();
      })
    );
  }

  /**
   * Change le statut d'un bien
   */
  changerStatut(id: string, statut: StatutBien): Observable<Bien> {
    return this.http.patch<Bien>(`${this.apiUrl}/${id}/statut`, { statut }).pipe(
      catchError((error: any) => {
        console.error('Erreur lors du changement de statut:', error);
        return of();
      })
    );
  }

  /**
   * Récupère les statistiques des biens
   */
  getStatistiques(): Observable<{
    total: number;
    parType: Record<TypeBien, number>;
    parStatut: Record<StatutBien, number>;
    parVille: Record<string, number>;
  }> {
    return this.http.get<any>(`${this.apiUrl}/statistiques`).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la récupération des statistiques:', error);
        return of(this.getMockStatistiques());
      })
    );
  }

  // Données mockées pour le développement
  private getMockBiens(): Bien[] {
    return [
      {
        id: '1',
        proprietaireId: 'mock-prop-1',
        titre: 'Appartement Lomé Centre',
        description: 'Bel appartement de 3 chambres situé au cœur de Lomé, proche de tous les commerces.',
        typeBien: TypeBien.APPARTEMENT,
        statut: StatutBien.OCCUPE,
        adresse: {
          quartier: 'Centre',
          ville: 'Lomé',
          adresseComplete: '123 Rue de la Paix, Lomé'
        },
        surface: 85,
        nbPieces: 3,
        loyer: 100000,
        photos: ['photo1.jpg', 'photo2.jpg'],
        dateCreation: new Date('2024-01-15'),
      },
      {
        id: '2',
        proprietaireId: 'mock-prop-1',
        titre: 'Villa Sokodé',
        description: 'Magnifique villa avec jardin et piscine, idéale pour une famille.',
        typeBien: TypeBien.VILLA,
        statut: StatutBien.OCCUPE,
        adresse: {
          quartier: 'Avenue des Martyrs',
          ville: 'Sokodé',
          adresseComplete: '45 Avenue des Martyrs, Sokodé'
        },
        surface: 200,
        nbPieces: 4,
        loyer: 150000,
        photos: ['photo3.jpg', 'photo4.jpg'],
        dateCreation: new Date('2024-02-01'),
      },
      {
        id: '3',
        proprietaireId: 'mock-prop-1',
        titre: 'Studio Kara',
        description: 'Studio moderne et fonctionnel, parfait pour un célibataire.',
        typeBien: TypeBien.STUDIO,
        statut: StatutBien.VACANT,
        adresse: {
          quartier: 'Rue du Commerce',
          ville: 'Kara',
          adresseComplete: '78 Rue du Commerce, Kara'
        },
        surface: 35,
        nbPieces: 1,
        loyer: 75000,
        photos: ['photo5.jpg'],
        dateCreation: new Date('2024-03-10'),
      },
      {
        id: '4',
        proprietaireId: 'mock-prop-1',
        titre: 'Bureau Kpalimé',
        description: 'Bureau spacieux dans un immeuble moderne, idéal pour une entreprise.',
        typeBien: TypeBien.BUREAU,
        statut: StatutBien.OCCUPE,
        adresse: {
          quartier: 'Zone Industrielle',
          ville: 'Kpalimé',
          adresseComplete: '12 Zone Industrielle, Kpalimé'
        },
        surface: 120,
        nbPieces: 3,
        loyer: 125000,
        photos: ['photo6.jpg', 'photo7.jpg'],
        dateCreation: new Date('2024-04-05'),
      },
      {
        id: '5',
        proprietaireId: 'mock-prop-1',
        titre: 'Local Commercial Lomé',
        description: 'Local commercial en vitrine, très fréquenté.',
        typeBien: TypeBien.LOCAL,
        statut: StatutBien.VACANT,
        adresse: {
          quartier: 'Grand Marché',
          ville: 'Lomé',
          adresseComplete: '56 Grand Marché, Lomé'
        },
        surface: 150,
        nbPieces: 1,
        loyer: 200000,
        photos: ['photo8.jpg'],
        dateCreation: new Date('2024-05-20'),
      },
      {
        id: '6',
        proprietaireId: 'mock-prop-1',
        titre: 'Chambre Atakpamé',
        description: 'Chambre meublée dans une maison calme.',
        typeBien: TypeBien.CHAMBRE,
        statut: StatutBien.VACANT,
        adresse: {
          quartier: 'Quartier Résidentiel',
          ville: 'Atakpamé',
          adresseComplete: 'Quartier Résidentiel, Atakpamé'
        },
        surface: 25,
        nbPieces: 1,
        loyer: 50000,
        photos: ['photo9.jpg'],
        dateCreation: new Date('2024-06-01'),
      }
    ];
  }

  private getMockStatistiques() {
    const biens = this.getMockBiens();
    return {
      total: biens.length,
      parType: {
        [TypeBien.APPARTEMENT]: biens.filter(b => b.typeBien === TypeBien.APPARTEMENT).length,
        [TypeBien.VILLA]: biens.filter(b => b.typeBien === TypeBien.VILLA).length,
        [TypeBien.STUDIO]: biens.filter(b => b.typeBien === TypeBien.STUDIO).length,
        [TypeBien.BUREAU]: biens.filter(b => b.typeBien === TypeBien.BUREAU).length,
        [TypeBien.LOCAL]: biens.filter(b => b.typeBien === TypeBien.LOCAL).length,
        [TypeBien.CHAMBRE]: biens.filter(b => b.typeBien === TypeBien.CHAMBRE).length
      },
      parStatut: {
        [StatutBien.OCCUPE]: biens.filter(b => b.statut === StatutBien.OCCUPE).length,
        [StatutBien.VACANT]: biens.filter(b => b.statut === StatutBien.VACANT).length,
        [StatutBien.EN_TRAVAUX]: biens.filter(b => b.statut === StatutBien.EN_TRAVAUX).length,
        [StatutBien.ARCHIVE]: biens.filter(b => b.statut === StatutBien.ARCHIVE).length
      },
      parVille: biens.reduce((acc, bien) => {
        acc[bien.adresse.ville] = (acc[bien.adresse.ville] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}

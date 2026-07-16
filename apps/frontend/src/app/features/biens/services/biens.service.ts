import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Bien, TypeBien, StatutBien } from '@core/models/bien.model';
import { environment } from '@env/environment';

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
  private readonly apiUrl = `${environment.apiUrl}/biens`;

  constructor(private http: HttpClient) {}

  /**
   * Récupère tous les biens avec filtres optionnels
   */
  getBiens(filters?: BiensFilters): Observable<Bien[]> {
    let params = new HttpParams();
    if (filters?.type)      params = params.set('type', filters.type);
    if (filters?.statut)    params = params.set('statut', filters.statut);
    if (filters?.ville)     params = params.set('ville', filters.ville);
    if (filters?.prixMin)   params = params.set('prixMin', filters.prixMin);
    if (filters?.prixMax)   params = params.set('prixMax', filters.prixMax);
    if (filters?.recherche) params = params.set('recherche', filters.recherche);
    return this.http.get<Bien[]>(this.apiUrl, { params });
  }

  /**
   * Récupère un bien par son ID
   */
  getBienById(id: string): Observable<Bien> {
    return this.http.get<Bien>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crée un nouveau bien
   */
  createBien(bien: Partial<Bien> | FormData): Observable<Bien> {
    return this.http.post<Bien>(this.apiUrl, bien);
  }

  /**
   * Met à jour un bien existant
   */
  updateBien(id: string, bien: Partial<Bien> | FormData): Observable<Bien> {
    return this.http.put<Bien>(`${this.apiUrl}/${id}`, bien);
  }

  /**
   * Supprime un bien
   */
  deleteBien(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  archiveBien(id: string): Observable<Bien> {
    return this.http.patch<Bien>(`${this.apiUrl}/${id}/archive`, {});
  }

  changerStatut(id: string, statut: StatutBien): Observable<Bien> {
    return this.http.patch<Bien>(`${this.apiUrl}/${id}/statut`, { statut });
  }

  getStatistiques(): Observable<{
    total: number;
    parType: Record<TypeBien, number>;
    parStatut: Record<StatutBien, number>;
    parVille: Record<string, number>;
  }> {
    return this.http.get<any>(`${this.apiUrl}/statistiques`);
  }

  // Données mockées conservées uniquement pour les tests unitaires
  getMockBiens(): Bien[] {
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

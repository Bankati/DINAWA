import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of } from 'rxjs';
import { Router } from '@angular/router';

export type UserType = 'proprietaire_local' | 'proprietaire_diaspora' | 'locataire' | 'gestionnaire';

export interface RegisterRequest {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  motDePasse: string;
  typeUtilisateur: UserType;
  pieceIdentite?: File;
  // Champs conditionnels
  ville?: string;
  paysResidence?: string;
  zoneIntervention?: string[];
  tarifs?: string;
  references?: string;
}

export interface LoginRequest {
  email: string;
  motDePasse: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  utilisateur: {
    id: string;
    prenom: string;
    nom: string;
    email: string;
    telephone: string;
    ville: string;
  };
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  nouveauMotDePasse: string;
}

export interface Verify2FARequest {
  email: string;
  code: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth'; // À remplacer par l'URL réelle de l'API
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Vérifier si un token existe au démarrage
    this.loadUserFromStorage();
  }

  /**
   * Charge l'utilisateur depuis le localStorage si un token existe
   * (localStorage n'existe pas côté serveur lors du rendu SSR)
   */
  private loadUserFromStorage(): void {
    if (!this.isBrowser) {
      return;
    }
    const token = localStorage.getItem('warah_token');
    const user = localStorage.getItem('warah_user');

    if (token && user) {
      this.currentUserSubject.next(JSON.parse(user));
    }
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  register(data: RegisterRequest): Observable<any> {
    const formData = new FormData();
    formData.append('prenom', data.prenom);
    formData.append('nom', data.nom);
    formData.append('email', data.email);
    formData.append('telephone', data.telephone);
    formData.append('motDePasse', data.motDePasse);
    formData.append('typeUtilisateur', data.typeUtilisateur);
    
    // Champs conditionnels
    if (data.ville) {
      formData.append('ville', data.ville);
    }
    if (data.paysResidence) {
      formData.append('paysResidence', data.paysResidence);
    }
    if (data.zoneIntervention && data.zoneIntervention.length > 0) {
      formData.append('zoneIntervention', JSON.stringify(data.zoneIntervention));
    }
    if (data.tarifs) {
      formData.append('tarifs', data.tarifs);
    }
    if (data.references) {
      formData.append('references', data.references);
    }
    if (data.pieceIdentite) {
      formData.append('pieceIdentite', data.pieceIdentite);
    }

    return this.http.post(`${this.apiUrl}/register`, formData).pipe(
      tap((response: any) => {
        // Stocker le token et l'utilisateur
        this.setSession(response);
      }),
      catchError((error: any) => {
        console.error('Erreur d\'inscription:', error);
        return of(error);
      })
    );
  }

  /**
   * Connexion de l'utilisateur
   */
  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, data).pipe(
      tap((response: LoginResponse) => {
        // Stocker le token et l'utilisateur
        this.setSession(response);
      }),
      catchError((error: any) => {
        console.error('Erreur de connexion:', error);
        return of(error);
      })
    );
  }

  /**
   * Vérification du code 2FA
   */
  verify2FA(data: Verify2FARequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/verify-2fa`, data).pipe(
      tap((response: LoginResponse) => {
        this.setSession(response);
      }),
      catchError((error: any) => {
        console.error('Erreur de vérification 2FA:', error);
        return of(error);
      })
    );
  }

  /**
   * Demande de réinitialisation de mot de passe
   */
  forgotPassword(data: ForgotPasswordRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, data).pipe(
      catchError((error: any) => {
        console.error('Erreur de demande de réinitialisation:', error);
        return of(error);
      })
    );
  }

  /**
   * Réinitialisation du mot de passe
   */
  resetPassword(data: ResetPasswordRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, data).pipe(
      catchError((error: any) => {
        console.error('Erreur de réinitialisation:', error);
        return of(error);
      })
    );
  }

  /**
   * Déconnexion de l'utilisateur
   */
  logout(): void {
    // Supprimer le token et l'utilisateur du localStorage
    if (this.isBrowser) {
      localStorage.removeItem('warah_token');
      localStorage.removeItem('warah_refresh_token');
      localStorage.removeItem('warah_user');
    }

    // Réinitialiser le BehaviorSubject
    this.currentUserSubject.next(null);
    
    // Rediriger vers la page de connexion
    this.router.navigate(['/auth/login']);
  }

  /**
   * Stocke la session utilisateur après connexion/inscription
   */
  private setSession(response: LoginResponse): void {
    if (this.isBrowser) {
      localStorage.setItem('warah_token', response.token);
      localStorage.setItem('warah_refresh_token', response.refreshToken);
      localStorage.setItem('warah_user', JSON.stringify(response.utilisateur));
    }

    this.currentUserSubject.next(response.utilisateur);
  }

  /**
   * Retourne le token JWT actuel
   */
  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem('warah_token') : null;
  }

  /**
   * Retourne l'utilisateur actuel
   */
  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  /**
   * Vérifie si l'utilisateur est connecté
   */
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  /**
   * Rafraîchit le token JWT
   */
  refreshToken(): Observable<LoginResponse> {
    const refreshToken = this.isBrowser ? localStorage.getItem('warah_refresh_token') : null;


    return this.http.post<LoginResponse>(`${this.apiUrl}/refresh-token`, { refreshToken }).pipe(
      tap((response: LoginResponse) => {
        this.setSession(response);
      }),
      catchError((error: any) => {
        // Si le refresh échoue, déconnecter l'utilisateur
        this.logout();
        return of(error);
      })
    );
  }
}

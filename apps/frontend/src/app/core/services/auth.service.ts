import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, from, BehaviorSubject, of, firstValueFrom, timer } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '@env/environment';
import { SupabaseService } from './supabase.service';
import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'OWNER' | 'TENANT' | 'MANAGER' | 'ADMIN';

export interface WARAHUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  accountStatus?: string;
}

export interface RegisterRequest {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  motDePasse: string;
  typeUtilisateur: 'proprietaire_local' | 'proprietaire_diaspora' | 'locataire' | 'gestionnaire';
  pieceIdentite?: File;
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

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  nouveauMotDePasse: string;
}

// Correspondance rôles Supabase → routes Angular
const ROLE_ROUTES: Record<string, string> = {
  OWNER:   '/dashboard',
  TENANT:  '/locataire',
  MANAGER: '/gestionnaire',
  ADMIN:   '/admin',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private currentUserSubject = new BehaviorSubject<WARAHUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Session Supabase courante (contient le JWT access_token)
  private session: Session | null = null;

  // Persiste en sessionStorage : évite de re-provisionner à chaque rechargement
  private get provisioned(): boolean {
    return sessionStorage.getItem('warah_provisioned') === '1';
  }
  private set provisioned(v: boolean) {
    if (v) sessionStorage.setItem('warah_provisioned', '1');
    else sessionStorage.removeItem('warah_provisioned');
  }

  constructor(
    private supabase: SupabaseService,
    private http: HttpClient,
    private router: Router,
  ) {
    if (this.isBrowser) {
      // Réveille le backend dès le démarrage (évite le cold start au moment du login)
      this.warmUpBackend();

      // Écouter les changements de session Supabase (refresh automatique, déconnexion)
      this.supabase.auth.onAuthStateChange(async (_event, session) => {
        this.session = session;
        if (session) {
          if (!this.provisioned) {
            // Premier login : /auth/register retourne le profil complet — un seul appel
            const user = await firstValueFrom(this.provisionAndGetProfile());
            if (user) this.currentUserSubject.next(user);
          } else {
            // Rechargement : utilisateur déjà en base, charger le profil directement
            await this.loadWARAHProfile();
          }
        } else {
          this.currentUserSubject.next(null);
        }
      });

      // Charger la session existante au démarrage (utilisateur déjà en base — pas besoin de register)
      this.supabase.getSession().then(({ data }) => {
        this.session = data.session;
        if (data.session) {
          this.loadWARAHProfile();
        }
      });
    }
  }

  // ── Authentification ─────────────────────────────────────────

  login(data: LoginRequest): Observable<WARAHUser> {
    return from(
      this.supabase.auth.signInWithPassword({
        email: data.email,
        password: data.motDePasse,
      })
    ).pipe(
      tap(({ error }) => { if (error) throw error; }),
      map(({ data: d }) => {
        this.session = d.session;
        // Émettre un profil préliminaire depuis les métadonnées Supabase — navigation immédiate
        const meta = d.user?.user_metadata ?? {};
        const prelimUser: WARAHUser = {
          id: d.user?.id ?? '',
          email: d.user?.email ?? data.email,
          firstName: meta['first_name'] ?? '',
          lastName: meta['last_name'] ?? '',
          role: (meta['role'] as UserRole) ?? 'OWNER',
          phone: meta['phone'],
        };
        this.currentUserSubject.next(prelimUser);
        // onAuthStateChange enrichira le profil depuis le backend en arrière-plan
        return prelimUser;
      })
    );
  }

  register(data: RegisterRequest): Observable<WARAHUser> {
    return from(
      this.supabase.auth.signUp({
        email: data.email,
        password: data.motDePasse,
        options: {
          data: {
            first_name: data.prenom,
            last_name: data.nom,
            phone: data.telephone,
            role: this.mapRole(data.typeUtilisateur),
          },
        },
      })
    ).pipe(
      tap(({ error }) => { if (error) throw error; }),
      map(({ data: d }) => {
        this.session = d.session;
        const meta = d.user?.user_metadata ?? {};
        const prelimUser: WARAHUser = {
          id: d.user?.id ?? '',
          email: d.user?.email ?? data.email,
          firstName: data.prenom,
          lastName: data.nom,
          role: this.mapRole(data.typeUtilisateur),
          phone: data.telephone,
        };
        this.currentUserSubject.next(prelimUser);
        return prelimUser;
      })
    );
  }

  forgotPassword(data: ForgotPasswordRequest): Observable<void> {
    return from(
      this.supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
    ).pipe(
      tap(({ error }) => { if (error) throw error; }),
      map(() => void 0)
    );
  }

  resetPassword(data: { token: string; nouveauMotDePasse: string }): Observable<void> {
    // Supabase injecte le token dans l'URL au retour de l'email de reset
    // On met à jour le mot de passe de la session courante
    return from(
      this.supabase.auth.updateUser({ password: data.nouveauMotDePasse })
    ).pipe(
      tap(({ error }) => { if (error) throw error; }),
      map(() => void 0)
    );
  }

  logout(): void {
    this.supabase.auth.signOut().then(() => {
      this.session = null;
      this.provisioned = false;
      this.currentUserSubject.next(null);
      this.router.navigate(['/auth/login']);
    });
  }

  // ── Token / session ──────────────────────────────────────────

  getToken(): string | null {
    return this.session?.access_token ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.session?.access_token;
  }

  getCurrentUser(): WARAHUser | null {
    return this.currentUserSubject.value;
  }

  // ── Profil backend ────────────────────────────────────────────

  // Ping le backend pour sortir du cold start avant que l'utilisateur clique sur "Se connecter"
  // /health/live est hors du préfixe /api — on retire le suffixe /api de l'URL de base
  private warmUpBackend(): void {
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    this.http.get(`${baseUrl}/health/live`, { responseType: 'text' })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  // Appelle /auth/register qui upserte l'utilisateur ET retourne son profil complet
  private provisionAndGetProfile(): Observable<WARAHUser | null> {
    const token = this.getToken();
    if (!token) return of(null);
    return this.http
      .post<any>(`${this.apiUrl}/register`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .pipe(
        tap(() => { this.provisioned = true; }),
        map((p) => ({
          id: p.id,
          email: p.email,
          firstName: p.firstName ?? p.profile?.firstName ?? '',
          lastName: p.lastName ?? p.profile?.lastName ?? '',
          role: p.role as UserRole,
          phone: p.phone,
          accountStatus: p.accountStatus,
        } as WARAHUser)),
        catchError(() => of(null))
      );
  }

  private async loadWARAHProfile(): Promise<WARAHUser> {
    const token = this.getToken();
    if (!token) {
      this.currentUserSubject.next(null);
      return Promise.reject(new Error('Pas de session'));
    }

    return new Promise((resolve, reject) => {
      this.http
        .get<any>(`${this.apiUrl}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .subscribe({
          next: (profile) => {
            const user: WARAHUser = {
              id: profile.id,
              email: profile.email,
              firstName: profile.firstName ?? profile.profile?.firstName ?? '',
              lastName: profile.lastName ?? profile.profile?.lastName ?? '',
              role: profile.role as UserRole,
              phone: profile.phone,
              accountStatus: profile.accountStatus,
            };
            this.currentUserSubject.next(user);
            resolve(user);
          },
          error: reject,
        });
    });
  }

  // Route par défaut selon le rôle de l'utilisateur
  getDefaultRoute(): string {
    const role = this.currentUserSubject.value?.role;
    return role ? (ROLE_ROUTES[role] ?? '/dashboard') : '/auth/login';
  }

  // ── Helpers ──────────────────────────────────────────────────

  private mapRole(type: RegisterRequest['typeUtilisateur']): UserRole {
    switch (type) {
      case 'proprietaire_local':
      case 'proprietaire_diaspora': return 'OWNER';
      case 'locataire':             return 'TENANT';
      case 'gestionnaire':          return 'MANAGER';
      default:                      return 'OWNER';
    }
  }
}

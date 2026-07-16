import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '@env/environment';

export type UserRole = 'OWNER' | 'TENANT' | 'MANAGER' | 'ADMIN';

export interface WARAHUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string | null;
  accountStatus?: string;
}

const ROLE_ROUTES: Record<string, string> = {
  OWNER:   '/dashboard',
  TENANT:  '/locataire',
  MANAGER: '/dashboard',
  ADMIN:   '/admin',
};

const TOKEN_KEY = 'warah_access_token';
const USER_KEY  = 'warah_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private currentUserSubject = new BehaviorSubject<WARAHUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    if (this.isBrowser) {
      this.warmUpBackend();
      const token = this.getToken();
      if (token) {
        this.loadProfile().subscribe();
      }
    }
  }

  // ── Connexion ─────────────────────────────────────────────────

  login(email: string, password: string): Observable<WARAHUser> {
    return this.http.post<{ accessToken: string; refreshToken: string; user: WARAHUser }>(
      `${this.apiUrl}/login`, { email, password }
    ).pipe(
      tap((res) => {
        localStorage.setItem(TOKEN_KEY, res.accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        this.currentUserSubject.next(res.user);
      }),
      map((res) => res.user)
    );
  }

  // ── Inscription OWNER ─────────────────────────────────────────

  signupOwner(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    residenceCountry: string;
    cniRecto: File;
    cniVerso: File;
  }): Observable<{ user: WARAHUser }> {
    const fd = new FormData();
    fd.append('email', data.email);
    fd.append('password', data.password);
    fd.append('firstName', data.firstName);
    fd.append('lastName', data.lastName);
    fd.append('residenceCountry', data.residenceCountry);
    fd.append('image', data.cniRecto);
    fd.append('imageBack', data.cniVerso);
    return this.http.post<{ user: WARAHUser }>(`${this.apiUrl}/signup/owner`, fd);
  }

  // ── Inscription MANAGER ───────────────────────────────────────

  signupManager(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    cniRecto: File;
    cniVerso: File;
    referenceDocuments?: File[];
  }): Observable<{ user: WARAHUser }> {
    const fd = new FormData();
    fd.append('email', data.email);
    fd.append('password', data.password);
    fd.append('firstName', data.firstName);
    fd.append('lastName', data.lastName);
    fd.append('image', data.cniRecto);
    fd.append('imageBack', data.cniVerso);
    data.referenceDocuments?.forEach(f => fd.append('referenceDocuments', f));
    return this.http.post<{ user: WARAHUser }>(`${this.apiUrl}/signup/manager`, fd);
  }

  // ── Activation locataire (lien email) ─────────────────────────

  activateTenant(token: string, password: string): Observable<{ userId: string }> {
    return this.http.post<{ userId: string }>(
      `${this.apiUrl}/signup/tenant?token=${encodeURIComponent(token)}`,
      { password }
    );
  }

  // ── Invitation locataire (par OWNER/MANAGER) ──────────────────

  inviteTenant(data: {
    propertyId: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
  }): Observable<{ user: WARAHUser; invitationUrl: string }> {
    return this.http.post<{ user: WARAHUser; invitationUrl: string }>(
      `${this.apiUrl}/invite/tenant`, data
    );
  }

  // ── Réinitialisation mot de passe (OTP 6 chiffres) ───────────

  requestPasswordReset(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/password-reset/request`, { email }
    );
  }

  confirmPasswordReset(email: string, code: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/password-reset/confirm`, { email, code, newPassword }
    );
  }

  // ── Profil courant ────────────────────────────────────────────

  loadProfile(): Observable<WARAHUser | null> {
    return this.http.get<any>(`${this.apiUrl}/me`).pipe(
      map((p) => {
        const user: WARAHUser = {
          id: p.id,
          email: p.email ?? '',
          firstName: p.firstName ?? '',
          lastName: p.lastName ?? '',
          role: p.role as UserRole,
          phone: p.phone,
          accountStatus: p.accountStatus,
        };
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.currentUserSubject.next(user);
        return user;
      }),
      catchError(() => {
        this.clearToken();
        this.currentUserSubject.next(null);
        return of(null);
      })
    );
  }

  // ── Token / session ───────────────────────────────────────────

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): WARAHUser | null {
    return this.currentUserSubject.value;
  }

  getDefaultRoute(): string {
    const role = this.currentUserSubject.value?.role;
    return role ? (ROLE_ROUTES[role] ?? '/dashboard') : '/auth/login';
  }

  logout(): void {
    this.clearToken();
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  private clearToken(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private warmUpBackend(): void {
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    this.http.get(`${baseUrl}/health/live`, { responseType: 'text' })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }
}

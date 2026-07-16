import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { AuthService, WARAHUser } from './auth.service';
import { SupabaseService } from './supabase.service';
import { environment } from '@env/environment';

// URL warmup : /health/live sans le préfixe /api
const HEALTH_URL = `${environment.apiUrl.replace(/\/api$/, '')}/health/live`;

// Session Supabase avec métadonnées utilisateur (utilisée par login() pour construire le profil préliminaire)
const mockSession = {
  access_token: 'mock-token-123',
  user: {
    id: 'u1',
    email: 'test@example.com',
    user_metadata: { role: 'OWNER', first_name: 'Kofi', last_name: 'Mensah', phone: '+22890000001' },
  },
} as any;

const supabaseMock = {
  auth: {
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn(),
  },
  getSession: jest.fn(),
};

const routerMock = { navigate: jest.fn() };

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    jest.clearAllMocks();
    supabaseMock.getSession.mockResolvedValue({ data: { session: null } });

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);

    // Le constructeur appelle warmUpBackend() — on absorbe cette requête immédiatement
    const warmup = http.match(HEALTH_URL);
    warmup.forEach((r) => r.flush('ok'));
  });

  afterEach(() => {
    http.verify();
  });

  // ── État initial ─────────────────────────────────────────────────

  describe('getToken()', () => {
    it('renvoie null sans session active', () => {
      expect(service.getToken()).toBeNull();
    });
  });

  describe('isLoggedIn()', () => {
    it('renvoie false sans session active', () => {
      expect(service.isLoggedIn()).toBe(false);
    });
  });

  describe('getCurrentUser()', () => {
    it('renvoie null au démarrage', () => {
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  // ── getDefaultRoute() ────────────────────────────────────────────

  describe('getDefaultRoute()', () => {
    it('renvoie /auth/login quand aucun utilisateur', () => {
      expect(service.getDefaultRoute()).toBe('/auth/login');
    });

    it.each([
      ['OWNER',   '/dashboard'],
      ['TENANT',  '/locataire'],
      ['MANAGER', '/gestionnaire'],
      ['ADMIN',   '/admin'],
    ])('role %s → route %s', (role, expectedRoute) => {
      (service as any).currentUserSubject.next({ role } as WARAHUser);
      expect(service.getDefaultRoute()).toBe(expectedRoute);
    });

    it('renvoie /dashboard pour un rôle inconnu', () => {
      (service as any).currentUserSubject.next({ role: 'UNKNOWN' } as any);
      expect(service.getDefaultRoute()).toBe('/dashboard');
    });
  });

  // ── login() ──────────────────────────────────────────────────────
  // login() construit le profil préliminaire depuis les métadonnées Supabase,
  // sans appel HTTP supplémentaire (optimistic login).

  describe('login()', () => {
    it('appelle signInWithPassword avec email et mot de passe', async () => {
      supabaseMock.auth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      await lastValueFrom(service.login({ email: 'test@example.com', motDePasse: 'secret' }));

      expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'secret',
      });
    });

    it('met à jour la session après connexion réussie', async () => {
      supabaseMock.auth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      await lastValueFrom(service.login({ email: 'test@example.com', motDePasse: 'secret' }));

      expect(service.getToken()).toBe('mock-token-123');
      expect(service.isLoggedIn()).toBe(true);
    });

    it('met à jour currentUser$ depuis les métadonnées Supabase', async () => {
      supabaseMock.auth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      const user = await lastValueFrom(service.login({ email: 'test@example.com', motDePasse: 'secret' }));

      expect(user.role).toBe('OWNER');
      expect(user.firstName).toBe('Kofi');
      expect(user.email).toBe('test@example.com');
    });

    it('propage l\'erreur Supabase en cas d\'identifiants invalides', async () => {
      supabaseMock.auth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: new Error('Invalid login credentials'),
      });

      await expect(
        lastValueFrom(service.login({ email: 'bad@example.com', motDePasse: 'wrong' }))
      ).rejects.toThrow('Invalid login credentials');
    });
  });

  // ── logout() ─────────────────────────────────────────────────────

  describe('logout()', () => {
    it('appelle signOut et navigue vers /auth/login', async () => {
      supabaseMock.auth.signOut.mockResolvedValue({});
      (service as any).session = mockSession;
      (service as any).currentUserSubject.next({ id: 'u1', email: 'test@example.com', role: 'OWNER' });

      service.logout();
      await new Promise((r) => setTimeout(r, 0));

      expect(supabaseMock.auth.signOut).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('réinitialise la session et l\'utilisateur courant', async () => {
      supabaseMock.auth.signOut.mockResolvedValue({});
      (service as any).session = mockSession;
      (service as any).currentUserSubject.next({ id: 'u1', email: 'test@example.com', role: 'OWNER' });

      service.logout();
      await new Promise((r) => setTimeout(r, 0));

      expect(service.getToken()).toBeNull();
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  // ── mapRole() via register() ──────────────────────────────────────
  // register() construit aussi le profil depuis les données du formulaire — pas d'appel /auth/me.

  describe('mapRole() (via register)', () => {
    it.each([
      ['proprietaire_local',     'OWNER'],
      ['proprietaire_diaspora',  'OWNER'],
      ['locataire',              'TENANT'],
      ['gestionnaire',           'MANAGER'],
    ] as const)('type "%s" → rôle Supabase "%s"', async (type, expectedRole) => {
      supabaseMock.auth.signUp.mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      await lastValueFrom(
        service.register({
          prenom: 'Test',
          nom: 'User',
          email: 'test@example.com',
          telephone: '+22890000001',
          motDePasse: 'pass123',
          typeUtilisateur: type,
        })
      );

      const callOptions = supabaseMock.auth.signUp.mock.calls[0][0].options.data;
      expect(callOptions.role).toBe(expectedRole);
    });
  });
});

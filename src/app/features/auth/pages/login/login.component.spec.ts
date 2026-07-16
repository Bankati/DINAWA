import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router, ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService, WARAHUser } from '../../../../core/services/auth.service';
import { ParticlesBackgroundComponent } from '../../../../shared/components/particles-background/particles-background.component';

const userMock: WARAHUser = {
  id: 'u1',
  email: 'test@example.com',
  firstName: 'Kofi',
  lastName: 'Mensah',
  role: 'OWNER',
};

const authServiceMock = {
  isLoggedIn: jest.fn().mockReturnValue(false),
  login: jest.fn(),
  getDefaultRoute: jest.fn().mockReturnValue('/dashboard'),
};

const routeMock = {
  snapshot: { queryParamMap: { get: jest.fn().mockReturnValue(null) } },
};

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let router: Router;

  beforeEach(async () => {
    jest.clearAllMocks();
    authServiceMock.isLoggedIn.mockReturnValue(false);
    authServiceMock.getDefaultRoute.mockReturnValue('/dashboard');

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: routeMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      // Retirer ParticlesBackgroundComponent pour éviter l'API canvas dans jsdom
      .overrideComponent(LoginComponent, {
        remove: { imports: [ParticlesBackgroundComponent] },
      })
      .compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Initialisation ───────────────────────────────────────────────

  describe('initialisation', () => {
    it('le formulaire commence invalide (champs vides)', () => {
      expect(component.loginForm.invalid).toBe(true);
    });

    it('isLoading est false par défaut', () => {
      expect(component.isLoading).toBe(false);
    });

    it('errorMessage est vide par défaut', () => {
      expect(component.errorMessage).toBe('');
    });

    it('redirige vers getDefaultRoute() si déjà connecté', () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);
      jest.mocked(router.navigate).mockClear();
      component.ngOnInit();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('ne redirige pas si non connecté', () => {
      authServiceMock.isLoggedIn.mockReturnValue(false);
      jest.mocked(router.navigate).mockClear();
      component.ngOnInit();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  // ── Validation du formulaire ─────────────────────────────────────

  describe('validation du formulaire', () => {
    it('le champ email est requis', () => {
      component.loginForm.setValue({ email: '', motDePasse: 'secret123' });
      expect(component.email?.errors?.['required']).toBeTruthy();
    });

    it('le champ email rejette un format invalide', () => {
      component.loginForm.setValue({ email: 'pas-un-email', motDePasse: 'secret123' });
      expect(component.email?.invalid).toBe(true);
    });

    it('le champ motDePasse est requis', () => {
      component.loginForm.setValue({ email: 'test@example.com', motDePasse: '' });
      expect(component.motDePasse?.errors?.['required']).toBeTruthy();
    });

    it('le formulaire est valide avec email et mot de passe corrects', () => {
      component.loginForm.setValue({ email: 'test@example.com', motDePasse: 'secret123' });
      expect(component.loginForm.valid).toBe(true);
    });
  });

  // ── onLogin() ────────────────────────────────────────────────────

  describe('onLogin()', () => {
    it('ne fait rien si le formulaire est invalide', () => {
      component.onLogin();
      expect(authServiceMock.login).not.toHaveBeenCalled();
    });

    it('appelle authService.login avec email et motDePasse', () => {
      authServiceMock.login.mockReturnValue(of(userMock));
      component.loginForm.setValue({ email: 'test@example.com', motDePasse: 'secret' });
      component.onLogin();
      expect(authServiceMock.login).toHaveBeenCalledWith('test@example.com', 'secret');
    });

    it('navigue vers getDefaultRoute() après connexion réussie', () => {
      authServiceMock.login.mockReturnValue(of(userMock));
      component.loginForm.setValue({ email: 'test@example.com', motDePasse: 'secret' });
      component.onLogin();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('navigue vers returnUrl si présent dans les queryParams', () => {
      authServiceMock.login.mockReturnValue(of(userMock));
      routeMock.snapshot.queryParamMap.get.mockReturnValue('/dashboard/biens');
      component.loginForm.setValue({ email: 'test@example.com', motDePasse: 'secret' });
      component.onLogin();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard/biens']);
    });

    it('affiche "Email ou mot de passe incorrect" pour Invalid login credentials', () => {
      authServiceMock.login.mockReturnValue(
        throwError(() => ({ error: { message: 'Invalid login credentials' } }))
      );
      component.loginForm.setValue({ email: 'bad@example.com', motDePasse: 'wrong' });
      component.onLogin();
      expect(component.errorMessage).toBe('Email ou mot de passe incorrect');
    });

    it('affiche le message brut pour les autres erreurs', () => {
      authServiceMock.login.mockReturnValue(
        throwError(() => ({ error: { message: 'Service temporairement indisponible' } }))
      );
      component.loginForm.setValue({ email: 'test@example.com', motDePasse: 'secret' });
      component.onLogin();
      expect(component.errorMessage).toBe('Service temporairement indisponible');
    });

    it('remet isLoading à false après une erreur', () => {
      authServiceMock.login.mockReturnValue(
        throwError(() => ({ error: { message: 'Erreur réseau' } }))
      );
      component.loginForm.setValue({ email: 'test@example.com', motDePasse: 'secret' });
      component.onLogin();
      expect(component.isLoading).toBe(false);
    });

    it('remet isLoading à false après une connexion réussie', () => {
      authServiceMock.login.mockReturnValue(of(userMock));
      component.loginForm.setValue({ email: 'test@example.com', motDePasse: 'secret' });
      component.onLogin();
      expect(component.isLoading).toBe(false);
    });
  });

  // ── Accesseurs du formulaire ─────────────────────────────────────

  describe('accesseurs', () => {
    it('email retourne le contrôle email', () => {
      expect(component.email).toBe(component.loginForm.get('email'));
    });

    it('motDePasse retourne le contrôle motDePasse', () => {
      expect(component.motDePasse).toBe(component.loginForm.get('motDePasse'));
    });
  });
});

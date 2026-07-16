import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let isLoggedInFn: jest.Mock;
  let navigateFn: jest.Mock;

  beforeEach(() => {
    isLoggedInFn = jest.fn();
    navigateFn = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: { isLoggedIn: isLoggedInFn } },
        { provide: Router,      useValue: { navigate: navigateFn } },
      ],
    });

    guard = TestBed.inject(AuthGuard);
  });

  it('laisse passer un utilisateur connecté', () => {
    isLoggedInFn.mockReturnValue(true);
    const result = guard.canActivate({} as any, { url: '/dashboard' } as any);
    expect(result).toBe(true);
    expect(navigateFn).not.toHaveBeenCalled();
  });

  it('redirige vers /auth/login si non connecté', () => {
    isLoggedInFn.mockReturnValue(false);
    const result = guard.canActivate({} as any, { url: '/dashboard' } as any);
    expect(result).toBe(false);
    expect(navigateFn).toHaveBeenCalledWith(
      ['/auth/login'],
      { queryParams: { returnUrl: '/dashboard' } },
    );
  });
});

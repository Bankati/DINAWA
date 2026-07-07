import {
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;

export const authInterceptor = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);

  // Ajouter le token JWT à chaque requête (sauf pour login/register)
  const token = authService.getToken();
  
  if (token && !isAuthRequest(request.url)) {
    request = addTokenHeader(request, token);
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si l'erreur est 401 (UNAUTHORIZED), essayer de rafraîchir le token
      if (error.status === 401 && !isRefreshing) {
        return handle401Error(request, next, authService);
      }
      
      return throwError(() => error);
    })
  );
};

/**
 * Vérifie si la requête est une requête d'authentification
 * (login, register, forgot-password, etc.)
 */
function isAuthRequest(url: string): boolean {
  return url.includes('/login') || 
         url.includes('/register') || 
         url.includes('/forgot-password') ||
         url.includes('/reset-password') ||
         url.includes('/verify-2fa');
}

/**
 * Ajoute le header Authorization avec le token JWT
 */
function addTokenHeader(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

/**
 * Gère les erreurs 401 en tentant de rafraîchir le token
 */
function handle401Error(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;

    return authService.refreshToken().pipe(
      switchMap(() => {
        isRefreshing = false;
        const newToken = authService.getToken();
        
        if (newToken) {
          return next(addTokenHeader(request, newToken));
        }
        
        return next(request);
      }),
      catchError((error: any) => {
        isRefreshing = false;
        
        // Si le refresh échoue, déconnecter l'utilisateur
        if (error.status === 401 || error.status === 403) {
          authService.logout();
        }
        
        return throwError(() => error);
      })
    );
  }

  return next(request);
}

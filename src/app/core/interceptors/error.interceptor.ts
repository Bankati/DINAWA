import { HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';

const MESSAGES: Record<number, string> = {
  400: 'Requête invalide. Vérifiez les données saisies.',
  401: 'Session expirée. Veuillez vous reconnecter.',
  403: 'Vous n\'avez pas les droits pour effectuer cette action.',
  404: 'Ressource introuvable.',
  409: 'Conflit : cette ressource existe déjà.',
  422: 'Données invalides. Vérifiez le formulaire.',
  429: 'Trop de requêtes. Veuillez patienter quelques instants.',
  500: 'Erreur serveur. Réessayez dans quelques instants.',
  502: 'Service temporairement indisponible.',
  503: 'Service en maintenance. Réessayez plus tard.',
};

export const errorInterceptor = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const notifications = inject(NotificationService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      // Les erreurs 401 sont déjà gérées par l'authInterceptor (refresh token)
      if (error.status === 401) {
        router.navigate(['/auth/login']);
        return throwError(() => error);
      }

      const message =
        error.error?.message ||
        MESSAGES[error.status] ||
        'Une erreur inattendue s\'est produite.';

      notifications.error(message);
      return throwError(() => error);
    })
  );
};

import { Injectable, inject } from "@angular/core";
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from "@angular/router";
import { AuthService } from "../services/auth.service";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AuthGuard implements CanActivate {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean> | Promise<boolean> | boolean {
    // Vérifier si l'utilisateur est connecté
    if (this.authService.isLoggedIn()) {
      return true;
    }

    // Si non connecté, rediriger vers la page de connexion
    void this.router.navigate(["/auth/login"], {
      queryParams: { returnUrl: state.url },
    });

    return false;
  }
}

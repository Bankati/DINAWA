import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { AnnoncesListComponent } from './pages/annonces-list/annonces-list.component';
import { AnnonceDetailPublicComponent } from './pages/annonce-detail-public/annonce-detail-public.component';
import { AnnoncesPublicComponent } from './pages/annonces-public/annonces-public.component';

export const annoncesRoutes: Routes = [
  // Espace public — accessible sans connexion (candidats locataires)
  {
    path: '',
    component: AnnoncesPublicComponent
  },
  // Vue lecture seule "Mes annonces" pour un propriétaire/gestionnaire connecté
  // — route statique avant le segment dynamique `:slug` ci-dessous, sinon
  // Angular la fait matcher comme un slug par erreur.
  {
    path: 'list',
    component: AnnoncesListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: ':slug',
    component: AnnonceDetailPublicComponent
  }
];

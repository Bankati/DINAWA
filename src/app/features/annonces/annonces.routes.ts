import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { AnnoncesListComponent } from './pages/annonces-list/annonces-list.component';
import { AnnonceFormComponent } from './pages/annonce-form/annonce-form.component';
import { AnnonceDetailComponent } from './pages/annonce-detail/annonce-detail.component';
import { AnnonceDetailPublicComponent } from './pages/annonce-detail-public/annonce-detail-public.component';
import { AnnoncesPublicComponent } from './pages/annonces-public/annonces-public.component';

export const annoncesRoutes: Routes = [
  // Espace public — accessible sans connexion (candidats locataires)
  {
    path: '',
    component: AnnoncesPublicComponent
  },
  {
    path: ':id',
    component: AnnonceDetailPublicComponent
  },
  // Espace de gestion — réservé aux propriétaires connectés
  {
    path: 'list',
    component: AnnoncesListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'new',
    component: AnnonceFormComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'list/:id',
    component: AnnonceDetailComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'list/:id/edit',
    component: AnnonceFormComponent,
    canActivate: [AuthGuard]
  }
];

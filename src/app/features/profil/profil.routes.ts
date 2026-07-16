import { Routes } from '@angular/router';

export const profilRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/profil/profil.component').then(m => m.ProfilComponent),
  },
];

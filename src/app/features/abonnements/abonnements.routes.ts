import { Routes } from '@angular/router';

export const abonnementsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/abonnements/abonnements.component').then(m => m.AbonnementsComponent)
  }
];

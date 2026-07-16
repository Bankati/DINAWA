import { Routes } from '@angular/router';

export const identiteRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/identite/identite.component').then(m => m.IdentiteComponent),
  },
];

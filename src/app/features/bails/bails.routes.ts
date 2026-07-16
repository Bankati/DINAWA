import { Routes } from '@angular/router';

export const bailsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/bails-list/bails-list.component').then(m => m.BailsListComponent),
  },
  {
    path: 'nouveau',
    loadComponent: () => import('./pages/bail-form/bail-form.component').then(m => m.BailFormComponent),
  },
];

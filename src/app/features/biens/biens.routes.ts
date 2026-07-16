import { Routes } from '@angular/router';

export const biensRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/biens-list/biens-list.component').then(m => m.BiensListComponent)
  },
  {
    path: 'nouveau',
    loadComponent: () => import('./pages/bien-form/bien-form.component').then(m => m.BienFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/bien-detail/bien-detail.component').then(m => m.BienDetailComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./pages/bien-form/bien-form.component').then(m => m.BienFormComponent)
  }
];

import { Routes } from '@angular/router';

export const locatairesRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/locataire-dashboard/locataire-dashboard.component').then(m => m.LocataireDashboardComponent)
  },
  {
    path: '',
    loadComponent: () => import('./pages/locataires-list/locataires-list.component').then(m => m.LocatairesListComponent)
  },
  {
    path: 'nouveau',
    loadComponent: () => import('./pages/locataire-form/locataire-form.component').then(m => m.LocataireFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/locataire-detail/locataire-detail.component').then(m => m.LocataireDetailComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./pages/locataire-form/locataire-form.component').then(m => m.LocataireFormComponent)
  }
];

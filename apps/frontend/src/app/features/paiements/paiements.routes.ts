import { Routes } from '@angular/router';

export const paiementsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/paiements-list/paiements-list.component').then(m => m.PaiementsListComponent)
  },
  {
    path: 'nouveau',
    loadComponent: () => import('./pages/paiement-form/paiement-form.component').then(m => m.PaiementFormComponent)
  }
];

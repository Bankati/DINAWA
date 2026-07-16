import { Routes } from '@angular/router';

export const paiementsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/paiements-list/paiements-list.component').then(m => m.PaiementsListComponent)
  },
  {
    path: 'nouveau',
    loadComponent: () => import('./pages/paiement-form/paiement-form.component').then(m => m.PaiementFormComponent)
  },
  {
    path: ':id/quittance',
    loadComponent: () => import('./pages/quittance/quittance.component').then(m => m.QuittanceComponent)
  },
  {
    path: 'mobile-money',
    loadComponent: () => import('./pages/mobile-money-payment/mobile-money-payment.component').then(m => m.MobileMoneyPaymentComponent)
  },
  {
    path: 'rappels',
    loadComponent: () => import('./pages/rappels-alertes/rappels-alertes.component').then(m => m.RappelsAlertesComponent)
  }
];

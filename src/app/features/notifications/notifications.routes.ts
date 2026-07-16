import { Routes } from '@angular/router';

export const notificationsRoutes: Routes = [
  {
    path: '',
    redirectTo: 'historique',
    pathMatch: 'full'
  },
  {
    path: 'historique',
    loadComponent: () => import('./pages/historique/historique.component').then(m => m.HistoriqueComponent)
  },
  {
    path: 'messagerie',
    loadComponent: () => import('./pages/messagerie/messagerie.component').then(m => m.MessagerieComponent)
  },
  {
    path: 'preferences',
    loadComponent: () => import('./pages/preferences/preferences.component').then(m => m.PreferencesComponent)
  }
];

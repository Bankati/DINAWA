import { Routes } from '@angular/router';
import { LocataireLayoutComponent } from '../../layouts/locataire-layout/locataire-layout.component';

export const locataireRoutes: Routes = [
  {
    path: '',
    component: LocataireLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/locataire-dashboard/locataire-dashboard.component').then(m => m.LocataireDashboardComponent)
      },
      {
        path: 'paiements',
        loadChildren: () => import('../paiements/paiements.routes').then(m => m.paiementsRoutes)
      },
      {
        path: 'notifications',
        loadChildren: () => import('../notifications/notifications.routes').then(m => m.notificationsRoutes)
      }
    ]
  }
];

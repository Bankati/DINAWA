import { Routes } from '@angular/router';
import { ProprietaireLayoutComponent } from '../../layouts/proprietaire-layout/proprietaire-layout.component';

export const dashboardRoutes: Routes = [
  {
    path: '',
    component: ProprietaireLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'biens',
        loadChildren: () => import('../biens/biens.routes').then(m => m.biensRoutes)
      },
      {
        path: 'locataires',
        loadChildren: () => import('../locataires/locataires.routes').then(m => m.locatairesRoutes)
      },
      {
        path: 'paiements',
        loadChildren: () => import('../paiements/paiements.routes').then(m => m.paiementsRoutes)
      },
      {
        path: 'notifications',
        loadChildren: () => import('../notifications/notifications.routes').then(m => m.notificationsRoutes)
      },
      {
        path: 'export',
        loadChildren: () => import('../export/export.routes').then(m => m.exportRoutes)
      },
      {
        path: 'annonces',
        loadChildren: () => import('../annonces/annonces.routes').then(m => m.annoncesRoutes)
      },
      {
        path: 'abonnements',
        loadChildren: () => import('../abonnements/abonnements.routes').then(m => m.abonnementsRoutes)
      }
    ]
  }
];

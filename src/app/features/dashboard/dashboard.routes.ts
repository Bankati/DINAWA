import { Routes } from '@angular/router';
import { AppShellLayoutComponent } from '../../layouts/app-shell-layout/app-shell-layout.component';

export const dashboardRoutes: Routes = [
  {
    path: '',
    component: AppShellLayoutComponent,
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
      // V2 — décommenter quand la fonctionnalité baux est activée
      // {
      //   path: 'bails',
      //   loadChildren: () => import('../bails/bails.routes').then(m => m.bailsRoutes)
      // },
      {
        path: 'profil',
        loadChildren: () => import('../profil/profil.routes').then(m => m.profilRoutes)
      },
      {
        path: 'identite',
        loadChildren: () => import('../identite/identite.routes').then(m => m.identiteRoutes)
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
        loadComponent: () => import('../annonces/pages/annonces-list/annonces-list.component').then(m => m.AnnoncesListComponent)
      },
      {
        path: 'abonnements',
        loadChildren: () => import('../abonnements/abonnements.routes').then(m => m.abonnementsRoutes)
      }
    ]
  }
];

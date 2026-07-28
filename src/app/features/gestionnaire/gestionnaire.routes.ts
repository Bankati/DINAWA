import { Routes } from '@angular/router';
import { AppShellLayoutComponent } from '../../layouts/app-shell-layout/app-shell-layout.component';

export const gestionnaireRoutes: Routes = [
  {
    path: '',
    component: AppShellLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/gestionnaire-dashboard/gestionnaire-dashboard.component').then(m => m.GestionnaireDashboardComponent)
      },
      {
        path: 'portefeuille',
        loadComponent: () => import('./pages/portefeuille/portefeuille.component').then(m => m.PortefeuilleComponent)
      },
      {
        path: 'profil-public',
        loadComponent: () => import('./pages/profil-public/profil-public.component').then(m => m.ProfilPublicComponent)
      },
      {
        path: 'rapports',
        loadComponent: () => import('./pages/rapports/rapports.component').then(m => m.RapportsComponent)
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
        path: 'annonces',
        loadComponent: () => import('../annonces/pages/annonces-list/annonces-list.component').then(m => m.AnnoncesListComponent)
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
        path: 'identite',
        loadChildren: () => import('../identite/identite.routes').then(m => m.identiteRoutes)
      }
    ]
  }
];

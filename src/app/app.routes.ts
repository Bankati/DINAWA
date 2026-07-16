import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/public/pages/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/pages/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/pages/register/register.component').then(m => m.RegisterComponent)
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./features/auth/pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
      },
      {
        path: 'activate',
        loadComponent: () => import('./features/auth/pages/activate/activate.component').then(m => m.ActivateComponent),
        title: 'Activation de compte - WARAH'
      }
    ]
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.dashboardRoutes)
  },
  {
    path: 'a-propos',
    loadComponent: () => import('./features/public/pages/a-propos/a-propos.component').then(m => m.AProposComponent)
  },
  {
    path: 'annonces',
    loadChildren: () => import('./features/annonces/annonces.routes').then(m => m.annoncesRoutes)
  },
  {
    path: 'proprietaires',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/proprietaires/proprietaires.routes').then(m => m.proprietairesRoutes)
  },
  {
    path: 'gestionnaire',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/gestionnaire/gestionnaire.routes').then(m => m.gestionnaireRoutes)
  },
  {
    path: 'locataire',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/locataire/locataire.routes').then(m => m.locataireRoutes)
  },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes)
  },
  {
    path: '**',
    redirectTo: '/auth/login'
  }
];

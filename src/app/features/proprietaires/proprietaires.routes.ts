import { Routes } from '@angular/router';
import { ProprietairesLayoutComponent } from './proprietaires-layout.component';
import { ProprietairesListComponent } from './pages/proprietaires-list/proprietaires-list.component';
import { ProprietaireFormComponent } from './pages/proprietaire-form/proprietaire-form.component';
import { ProprietaireDetailComponent } from './pages/proprietaire-detail/proprietaire-detail.component';
import { ProprietaireDashboardComponent } from './pages/proprietaire-dashboard/proprietaire-dashboard.component';

export const proprietairesRoutes: Routes = [
  {
    path: '',
    component: ProprietairesLayoutComponent,
    children: [
      { path: 'dashboard', component: ProprietaireDashboardComponent },
      { path: '',          component: ProprietairesListComponent },
      { path: 'new',       component: ProprietaireFormComponent },
      { path: ':id',       component: ProprietaireDetailComponent },
      { path: ':id/edit',  component: ProprietaireFormComponent }
    ]
  }
];

import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { ComptesComponent } from './pages/comptes/comptes.component';
import { TransactionsComponent } from './pages/transactions/transactions.component';
import { LitigesComponent } from './pages/litiges/litiges.component';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'comptes', component: ComptesComponent },
      { path: 'transactions', component: TransactionsComponent },
      { path: 'litiges', component: LitigesComponent }
    ]
  }
];

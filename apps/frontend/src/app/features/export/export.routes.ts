import { Routes } from '@angular/router';

export const exportRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/export/export.component').then(m => m.ExportComponent)
  }
];

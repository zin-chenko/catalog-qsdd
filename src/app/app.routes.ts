import { Routes } from '@angular/router';
import { DocumentsComponent } from './features/documents/documents.component';
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'documents/orders' },
  { path: 'documents/:folderId/:documentId/:tab', component: DocumentsComponent },
  { path: 'documents/:folderId', component: DocumentsComponent },
  {
    path: 'tasks',
    loadComponent: () => import('./features/tasks/tasks.component').then((m) => m.TasksComponent),
  },
  {
    path: 'reports',
    loadComponent: () => import('./features/reports/reports.component').then((m) => m.ReportsComponent),
  },
  {
    path: 'routes',
    loadComponent: () => import('./features/routes/routes.component').then((m) => m.RoutesComponent),
  },
  { path: '**', redirectTo: 'documents/orders' },
];

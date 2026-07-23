import { Routes } from '@angular/router';
import { tabGuard } from './guards/tab.guard';
import { adminGuard } from './guards/admin.guard';
import { LoginComponent } from './pages/login.component';

/**
 * Los tableros se declaran en pages.ts (misma lista que alimenta el selector) y
 * se cargan lazy: cada uno arrastra su propio Chart.js y lógica, no hace falta
 * pagarlos todos en el bundle inicial. data.tabId debe coincidir con el id de
 * pages.ts / TabVisibility.KNOWN_KEYS del backend: tabGuard lo usa para saber si
 * un VIEWER tiene esta pestaña habilitada.
 */
export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    canActivate: [tabGuard],
    data: { tabId: 'dashboard0800' },
    loadComponent: () => import('./pages/dashboard-0800.component').then(m => m.Dashboard0800Component)
  },
  {
    path: 'wad',
    canActivate: [tabGuard],
    data: { tabId: 'wad' },
    loadComponent: () => import('./pages/wad-dashboard.component').then(m => m.WadDashboardComponent)
  },
  {
    path: 'egg',
    canActivate: [tabGuard],
    data: { tabId: 'egg' },
    loadComponent: () => import('./pages/egg-dashboard.component').then(m => m.EggDashboardComponent)
  },
  {
    path: 'cruce',
    canActivate: [tabGuard],
    data: { tabId: 'cruce' },
    loadComponent: () => import('./pages/cruce.component').then(m => m.CruceComponent)
  },
  {
    path: 'datos',
    canActivate: [tabGuard],
    data: { tabId: 'datos' },
    loadComponent: () => import('./pages/datos.component').then(m => m.DatosComponent)
  },
  {
    path: 'admin/users',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin-users.component').then(m => m.AdminUsersComponent)
  },

  { path: '**', redirectTo: '' }
];

import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './pages/login.component';

/**
 * Los tableros se declaran en pages.ts (misma lista que alimenta el selector) y
 * se cargan lazy: cada uno arrastra su propio Chart.js y lógica, no hace falta
 * pagarlos todos en el bundle inicial.
 */
export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard-0800.component').then(m => m.Dashboard0800Component)
  },
  {
    path: 'wad',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/wad-dashboard.component').then(m => m.WadDashboardComponent)
  },
  {
    path: 'egg',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/egg-dashboard.component').then(m => m.EggDashboardComponent)
  },
  {
    path: 'cruce',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/cruce.component').then(m => m.CruceComponent)
  },

  { path: '**', redirectTo: '' }
];

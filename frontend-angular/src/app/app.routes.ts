import { Routes } from '@angular/router';
import { Dashboard0800Component } from './pages/dashboard-0800.component';
import { WadDashboardComponent } from './pages/wad-dashboard.component';
import { EjecutivoDashboardComponent } from './pages/ejecutivo-dashboard.component';

export const routes: Routes = [
  { path: '', component: Dashboard0800Component },
  { path: 'wad', component: WadDashboardComponent },
  // Ruta intencionalmente sin link en el navbar (ver app.component.ts): solo accesible por URL directa.
  { path: 'ejecutivo', component: EjecutivoDashboardComponent },
  { path: '**', redirectTo: '' }
];

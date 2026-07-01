import { Routes } from '@angular/router';
import { Dashboard0800Component } from './pages/dashboard-0800.component';
import { WadDashboardComponent } from './pages/wad-dashboard.component';

export const routes: Routes = [
  { path: '', component: Dashboard0800Component },
  { path: 'wad', component: WadDashboardComponent },
  { path: '**', redirectTo: '' }
];

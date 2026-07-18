import { Component, OnInit, inject } from '@angular/core';
import { DashboardService } from '../services/dashboard.service';
import { AuthService } from '../services/auth.service';
import { UploadComponent } from '../components/upload.component';
import { FiltersComponent } from '../components/filters.component';
import { MetricsComponent } from '../components/metrics.component';
import { HourChartComponent } from '../components/hour-chart.component';
import { TipoChartComponent } from '../components/tipo-chart.component';
import { DateChartComponent } from '../components/date-chart.component';
import { AgentsTableComponent } from '../components/agents-table.component';

@Component({
  selector: 'app-dashboard-0800',
  standalone: true,
  imports: [
    UploadComponent, FiltersComponent, MetricsComponent,
    HourChartComponent, TipoChartComponent, DateChartComponent, AgentsTableComponent
  ],
  template: `
    <div class="dash">
      @if (auth.isAdmin()) { <app-upload /> }
      <app-filters />
      <app-metrics />
      <div class="crow">
        <app-hour-chart />
        <app-tipo-chart />
      </div>
      <app-date-chart />
      <app-agents-table />
    </div>
  `
})
export class Dashboard0800Component implements OnInit {
  private svc = inject(DashboardService);
  readonly auth = inject(AuthService);

  async ngOnInit() {
    try { await this.svc.fetchData(); } catch { /* el upload mostrará el estado */ }
  }
}

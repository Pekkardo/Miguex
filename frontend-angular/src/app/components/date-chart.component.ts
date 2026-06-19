import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject } from '@angular/core';
import { DashboardService } from '../services/dashboard.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-date-chart',
  standalone: true,
  host: { class: 'card' },
  template: `
    <div class="ctitle">Llamadas y matriculados por fecha</div>
    <div class="legend">
      <span class="leg-item"><span class="leg-dot" style="background:#85B7EB"></span>Llamadas</span>
      <span class="leg-item"><span class="leg-dot" style="background:#7F77DD"></span>Matriculados</span>
    </div>
    <div class="dchart"><canvas #canvas></canvas></div>
  `
})
export class DateChartComponent implements AfterViewInit, OnDestroy {
  private svc = inject(DashboardService);
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;
  private ready = false;

  constructor() {
    // Redibuja cuando cambian los datos filtrados.
    effect(() => {
      const data = this.svc.filteredConnected();
      if (this.ready) this.render(data);
    });
  }

  ngAfterViewInit() {
    this.ready = true;
    this.render(this.svc.filteredConnected());
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }

  private render(rows: ReturnType<DashboardService['filteredConnected']>) {
    const dm: Record<string, number> = {};
    const mm: Record<string, number> = {};
    const labelToIso: Record<string, string> = {};
    rows.forEach(r => {
      if (!r.dateKey) return;
      const k = r.dateKey.slice(8, 10) + '/' + r.dateKey.slice(5, 7);
      dm[k] = (dm[k] || 0) + 1;
      if (r.mat) mm[k] = (mm[k] || 0) + 1;
      labelToIso[k] = r.dateKey;
    });
    const labels = Object.keys(dm).sort((a, b) => labelToIso[a].localeCompare(labelToIso[b]));

    this.chart?.destroy();
    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Llamadas', data: labels.map(k => dm[k] || 0), backgroundColor: '#85B7EB', borderRadius: 3, borderSkipped: false },
          { label: 'Matriculados', data: labels.map(k => mm[k] || 0), backgroundColor: '#7F77DD', borderRadius: 3, borderSkipped: false }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { title: items => 'Fecha: ' + items[0].label } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45, autoSkip: false } },
          y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 9 } }, beginAtZero: true }
        },
        onClick: (_evt, els) => {
          if (!els.length) return;
          const iso = labelToIso[labels[els[0].index]];
          if (iso) this.svc.patchFilters({ desde: iso, hasta: iso });
        }
      }
    });
  }
}

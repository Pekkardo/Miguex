import { Component, computed, inject } from '@angular/core';
import { DashboardService } from '../services/dashboard.service';

@Component({
  selector: 'app-tipo-chart',
  standalone: true,
  host: { class: 'card' },
  template: `
    <div class="ctitle">Tipo de línea</div>
    <div class="bars">
      @if (rows().length) {
        @for (r of rows(); track r.l) {
          <div class="brow">
            <span class="blbl-w">{{ r.l }}</span>
            <div class="btrack">
              <div class="bfill" [style.width.%]="r.w" style="background:#1D9E75"></div>
            </div>
            <span class="bcnt">{{ r.c }}</span>
          </div>
        }
      } @else {
        <div class="empty">Cargá un archivo</div>
      }
    </div>
  `
})
export class TipoChartComponent {
  svc = inject(DashboardService);

  rows = computed(() => {
    const tm: Record<string, number> = {};
    this.svc.filteredConnected().forEach(r => {
      const t = r.tipo;
      const l = t === 'NAC-CEL' ? 'Cel. nac.'
        : t === 'NAC-FIJO' ? 'Fijo nac.'
        : t === 'LOC-FIJO' ? 'Fijo local'
        : (t || 'Otro');
      tm[l] = (tm[l] || 0) + 1;
    });
    const entries = Object.entries(tm).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...entries.map(e => e[1]), 1);
    return entries.map(([l, c]) => ({ l, c, w: Math.round(c / max * 100) }));
  });
}

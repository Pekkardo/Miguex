import { Component, computed, inject } from '@angular/core';
import { DashboardService } from '../services/dashboard.service';
import { fmtSec } from '../models/call.model';

@Component({
  selector: 'app-metrics',
  standalone: true,
  template: `
    <div class="metrics">
      <div class="metric">
        <div class="mlabel">Llamadas</div>
        <div class="mval">{{ total() }}</div>
        <div class="msub">{{ totalSub() }}</div>
      </div>
      <div class="metric g">
        <div class="mlabel">Conectadas</div>
        <div class="mval">{{ conn().length }}</div>
        <div class="msub">{{ pct() }}% atención</div>
      </div>
      <div class="metric a">
        <div class="mlabel">Perdidas</div>
        <div class="mval">{{ lost() }}</div>
        <div class="msub">{{ 100 - pct() }}% abandono</div>
      </div>
      <div class="metric p">
        <div class="mlabel">Matriculados</div>
        <div class="mval">{{ mat() }}</div>
        <div class="msub">{{ mpct() }}% conversión</div>
      </div>
      <div class="metric">
        <div class="mlabel">Dur. prom.</div>
        <div class="mval">{{ avgFmt() }}</div>
        <div class="msub">por llamada</div>
      </div>
    </div>
  `
})
export class MetricsComponent {
  private svc = inject(DashboardService);

  total = computed(() => this.svc.filtered().length);
  conn = computed(() => this.svc.filteredConnected());
  lost = computed(() => this.svc.filteredLost().length);
  pct = computed(() => { const t = this.total(); return t ? Math.round(this.conn().length / t * 100) : 0; });
  mat = computed(() => this.conn().filter(r => r.mat).length);
  mpct = computed(() => { const c = this.conn().length; return c ? Math.round(this.mat() / c * 100) : 0; });
  avgFmt = computed(() => {
    const durs = this.conn().map(r => r.dur).filter(d => d > 0);
    const avg = durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : 0;
    return fmtSec(avg);
  });
  totalSub = computed(() => {
    const raw = this.svc.allRows().length;
    return (raw && this.total() < raw) ? `de ${raw} total` : 'total';
  });
}

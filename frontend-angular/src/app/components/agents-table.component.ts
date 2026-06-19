import { Component, computed, inject, signal } from '@angular/core';
import { DashboardService } from '../services/dashboard.service';
import { fmtSec } from '../models/call.model';

type SortKey = 'calls' | 'mat' | 'conv' | 'dur';

@Component({
  selector: 'app-agents-table',
  standalone: true,
  template: `
    <div class="atcard">
      <div class="atcard-hdr">
        <div class="ctitle" style="margin:0">Rendimiento por agente</div>
        <select [value]="sort()" (change)="sort.set($any($event.target).value)"
                style="font-size:11px;border:1px solid var(--border2);border-radius:6px;padding:4px 7px;background:var(--bg);cursor:pointer;outline:none">
          <option value="calls">Por llamadas</option>
          <option value="mat">Por matriculados</option>
          <option value="conv">Por conversión</option>
          <option value="dur">Por duración</option>
        </select>
      </div>
      <table>
        <thead>
          <tr><th>#</th><th>Agente</th><th>Llamadas</th><th>Matriculados</th><th>Conv.%</th><th>Dur.prom.</th></tr>
        </thead>
        <tbody>
          @if (rows().length) {
            @for (r of rows(); track r.name) {
              <tr style="cursor:pointer" (click)="svc.toggleAgent(r.name)">
                <td><span class="rank" [class.top]="r.top">{{ r.rank }}</span></td>
                <td>{{ r.name }}</td>
                <td>{{ r.calls }}</td>
                <td>
                  @if (r.mat > 0) { <span class="mpill">{{ r.mat }}</span> } @else { — }
                </td>
                <td>
                  @if (r.conv > 0) {
                    {{ r.conv }}%<span class="pbar"><span class="pfill" [style.width.%]="min(r.conv * 2, 100)"></span></span>
                  } @else { — }
                </td>
                <td>{{ fmt(r.avgDur) }}</td>
              </tr>
            }
          } @else {
            <tr><td colspan="6" class="empty" style="text-align:center;padding:18px">Cargá un archivo</td></tr>
          }
        </tbody>
      </table>
    </div>
  `
})
export class AgentsTableComponent {
  svc = inject(DashboardService);
  sort = signal<SortKey>('calls');
  fmt = fmtSec;
  min = Math.min;

  rows = computed(() => {
    const am: Record<string, { calls: number; mat: number; dur: number }> = {};
    this.svc.filteredConnected().forEach(r => {
      (am[r.agent] ??= { calls: 0, mat: 0, dur: 0 });
      am[r.agent].calls++;
      am[r.agent].dur += r.dur;
      if (r.mat) am[r.agent].mat++;
    });
    const arr = Object.entries(am).map(([name, a]) => ({ name, ...a }));
    const s = this.sort();
    arr.sort((a, b) => {
      if (s === 'calls') return b.calls - a.calls;
      if (s === 'mat') return b.mat - a.mat;
      if (s === 'conv') return (b.calls ? b.mat / b.calls : 0) - (a.calls ? a.mat / a.calls : 0);
      if (s === 'dur') return (b.calls ? b.dur / b.calls : 0) - (a.calls ? a.dur / a.calls : 0);
      return 0;
    });
    return arr.slice(0, 12).map((a, i) => ({
      ...a,
      rank: i + 1,
      top: i < 3,
      conv: a.calls ? Math.round(a.mat / a.calls * 100) : 0,
      avgDur: a.calls ? Math.round(a.dur / a.calls) : 0
    }));
  });
}

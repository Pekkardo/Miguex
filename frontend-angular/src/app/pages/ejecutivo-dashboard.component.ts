import {
  AfterViewInit, Component, ElementRef, OnDestroy, OnInit,
  ViewChild, computed, effect, inject, signal
} from '@angular/core';
import { EjecutivoService } from '../services/ejecutivo.service';
import { EjecutivoFilters, EjecutivoRow } from '../models/ejecutivo.model';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const MESES: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
  7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
};

const PALETTE = ['#185FA5', '#D85A30', '#BA7517', '#534AB7', '#1D9E75', '#C2378A',
  '#0E8FA0', '#C79A1E', '#5B6FE0', '#2F9E44', '#E8590C', '#868E96'];

type SortKey = 'dk' | 'dia' | 'tel' | 'rep' | 'res' | 'sal' | 'est' | 'usr';

@Component({
  selector: 'app-ejecutivo-dashboard',
  standalone: true,
  template: `
    <div class="dash">

      <!-- UPLOAD -->
      <div class="upload" [class.drag]="drag()" [class.done]="done()"
           (click)="fileInput.click()"
           (dragover)="onDragOver($event)" (dragleave)="drag.set(false)" (drop)="onDrop($event)">
        @if (!done()) {
          <p>📊 <strong>Subir Excel</strong> — hacé clic o arrastrá acá</p>
          <p style="font-size:11px;margin-top:3px;color:var(--muted2)">Hoja: Detalle1 • Columnas: Fecha real, Dia, Mes, Telefono, Repetidos, Resolucion V2, salientes, Estado, Usuario, SubCategoria</p>
        } @else {
          <p class="fn">{{ status() }}</p>
          <p style="font-size:11px;margin-top:2px;color:var(--muted)">Hacé clic o arrastrá para reemplazar</p>
        }
      </div>
      <input #fileInput type="file" accept=".xlsx,.xls" hidden (change)="onPick($event)">

      <!-- FILTERS -->
      <div class="fbar">
        <span class="fbar-title">Filtros</span>
        <div class="filter-group"><label>Mes</label>
          <select [value]="f().mes" (change)="set('mes', $event)">
            <option value="">Todos</option>
            @for (m of svc.meses(); track m) { <option [value]="m">{{ MESES[m] || m }}</option> }
          </select>
        </div>
        <div class="filter-group"><label>Día</label>
          <select [value]="f().dia" (change)="set('dia', $event)">
            <option value="">Todos</option>
            @for (d of svc.dias(); track d) { <option [value]="d">{{ d }}</option> }
          </select>
        </div>
        <div class="filter-group"><label>Resolución</label>
          <select [value]="f().res" (change)="set('res', $event)">
            <option value="">Todas</option>
            @for (r of svc.resoluciones(); track r) { <option [value]="r">{{ r }}</option> }
          </select>
        </div>
        <div class="filter-group"><label>Respondido</label>
          <div class="chip-row">
            @for (c of salChips; track c.v) {
              <span class="chip" [class.active]="f().sal === c.v" (click)="svc.patchFilters({ sal: c.v })">{{ c.l }}</span>
            }
          </div>
        </div>
        <div class="filter-group"><label>Repetidos</label>
          <div class="chip-row">
            @for (c of repChips; track c.v) {
              <span class="chip" [class.active]="f().rep === c.v" (click)="svc.patchFilters({ rep: c.v })">{{ c.l }}</span>
            }
          </div>
        </div>
        <div class="filter-group"><label>Buscar</label>
          <input type="text" placeholder="Teléfono, usuario, resolución…" [value]="f().search" (input)="set('search', $event)">
        </div>
        <button class="reset-btn" (click)="svc.resetFilters()">✕ Limpiar</button>
      </div>

      <!-- METRICS -->
      <div class="ej-metrics">
        <div class="metric"><div class="mlabel">Total de chats</div><div class="mval">{{ m().total }}</div><div class="msub">en el período filtrado</div></div>
        <div class="metric g"><div class="mlabel">Respondidos</div><div class="mval">{{ m().resp }}</div><div class="msub">{{ m().total ? m().respP + '% del total' : '—' }}</div></div>
        <div class="metric a"><div class="mlabel">No respondidos</div><div class="mval">{{ m().nresp }}</div><div class="msub">{{ m().total ? m().nrespP + '% del total' : '—' }}</div></div>
        <div class="metric p"><div class="mlabel">Resoluciones distintas</div><div class="mval">{{ m().resDist }}</div><div class="msub">tipificaciones activas</div></div>
      </div>

      <!-- CHARTS: saliente / volumen por dia -->
      <div class="crow">
        <div class="card">
          <div class="ctitle">Respondidos vs. no respondidos</div>
          <div class="dchart"><canvas #chartSaliente></canvas></div>
        </div>
        <div class="card">
          <div class="ctitle">Volumen por día</div>
          <div class="dchart"><canvas #chartDia></canvas></div>
        </div>
      </div>

      <!-- CHARTS: dia+saliente / resolucion -->
      <div class="crow">
        <div class="card">
          <div class="ctitle">Respondidos por día</div>
          <div class="dchart"><canvas #chartDiaSaliente></canvas></div>
        </div>
        <div class="card">
          <div class="ctitle">Distribución de resoluciones</div>
          <div class="dchart" style="height:220px"><canvas #chartResolucion></canvas></div>
        </div>
      </div>

      <!-- RES BOARD -->
      <div class="card">
        <div class="ctitle">Tablero de tipificaciones <span>ordenado de mayor a menor</span></div>
        <div class="ej-res-board">
          @if (resBoard().length) {
            @for (r of resBoard(); track r.name; let i = $index) {
              <div class="ej-res-card" [style.--c]="color(i)">
                <div class="name">{{ r.name }}</div>
                <div class="count">{{ r.count }}</div>
                <div class="pct">{{ r.pct }}% del total</div>
              </div>
            }
          } @else { <div class="empty">Cargá un archivo</div> }
        </div>
      </div>

      <!-- TABLE -->
      <div class="atcard">
        <div class="atcard-hdr">
          <div class="ctitle" style="margin:0">Listado filtrable <span>{{ svc.filtered().length }} chats</span></div>
        </div>
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th (click)="onSort('dk')">Fecha</th>
                <th (click)="onSort('dia')">Día</th>
                <th (click)="onSort('tel')">Teléfono</th>
                <th (click)="onSort('rep')">Repetidos</th>
                <th (click)="onSort('res')">Resolución V2</th>
                <th (click)="onSort('sal')">Respondido</th>
                <th (click)="onSort('est')">Estado chat</th>
                <th (click)="onSort('usr')">Usuario</th>
              </tr>
            </thead>
            <tbody>
              @if (pageRows().length) {
                @for (d of pageRows(); track $index) {
                  <tr>
                    <td>{{ d.dk }}</td>
                    <td>{{ d.dia }}</td>
                    <td>{{ d.tel }}</td>
                    <td><span class="mpill" [class.rep-dup]="d.rep !== 'Único'">{{ d.rep }}</span></td>
                    <td>{{ d.res }}</td>
                    <td>
                      <span class="mpill" [class.sal-no]="d.sal !== 'SI'">{{ d.sal === 'SI' ? 'Sí' : 'No' }}</span>
                    </td>
                    <td>{{ d.est }}</td>
                    <td>{{ d.usr }}</td>
                  </tr>
                }
              } @else { <tr><td colspan="8" class="empty" style="text-align:center">Cargá un archivo</td></tr> }
            </tbody>
          </table>
        </div>
        <div class="ej-pager">
          <span>{{ pageInfo() }}</span>
          <div>
            <button (click)="prevPage()" [disabled]="page() <= 0">‹ Anterior</button>
            <button (click)="nextPage()" [disabled]="page() >= totalPages() - 1">Siguiente ›</button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host{ display:block; }
    .ej-metrics{ display:grid; grid-template-columns:repeat(4,1fr); gap:9px; }
    .ej-res-board{ display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; }
    .ej-res-card{
      background:var(--bg); border:1px solid var(--border); border-left:4px solid var(--c);
      border-radius:8px; padding:11px 13px;
    }
    .ej-res-card .name{ font-size:11.5px; color:var(--text); font-weight:700; line-height:1.3; margin-bottom:8px; min-height:28px; }
    .ej-res-card .count{ font-size:19px; font-weight:700; color:var(--c); }
    .ej-res-card .pct{ font-size:11px; color:var(--muted); margin-top:1px; }

    .mpill{ font-size:11px; padding:2px 9px; border-radius:99px; font-weight:600; display:inline-block;
      background:var(--green-bg); color:var(--green); }
    .mpill.rep-dup{ background:var(--amber-bg); color:var(--amber); }
    .mpill.sal-no{ background:var(--coral-bg,#FDEEE9); color:var(--coral); }

    .ej-pager{ display:flex; justify-content:space-between; align-items:center; padding:10px 15px; border-top:1px solid var(--border); font-size:12px; color:var(--muted); }
    .ej-pager button{ background:var(--bg); border:1px solid var(--border2); color:var(--text); padding:4px 11px; border-radius:6px; cursor:pointer; font-size:12px; }
    .ej-pager button:disabled{ opacity:.35; cursor:default; }
    .ej-pager button:hover:not(:disabled){ border-color:var(--blue); color:var(--blue); }

    .fbar input[type=text]{ font-size:12px; border:1px solid var(--border2); border-radius:6px; padding:5px 8px; background:var(--bg); color:var(--text); outline:none; min-width:220px; }
    .fbar input[type=text]:focus{ border-color:var(--blue); }
  `]
})
export class EjecutivoDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  svc = inject(EjecutivoService);
  f = this.svc.filters;

  readonly MESES = MESES;

  @ViewChild('chartSaliente') chartSalienteRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartDia') chartDiaRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartDiaSaliente') chartDiaSalienteRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartResolucion') chartResolucionRef?: ElementRef<HTMLCanvasElement>;

  private charts: Record<string, Chart> = {};
  private ready = false;

  // upload state
  drag = signal(false);
  done = signal(false);
  status = signal('');

  // tabla
  sortKey = signal<SortKey>('dk');
  sortDir = signal<'asc' | 'desc'>('desc');
  page = signal(0);
  pageSize = 50;

  salChips = [{ v: '', l: 'Todos' }, { v: 'SI', l: 'Sí' }, { v: 'NO', l: 'No' }];
  repChips = [{ v: '', l: 'Todos' }, { v: 'Único', l: 'Único' }, { v: 'Duplicado', l: 'Duplicado' }];

  constructor() {
    effect(() => {
      const data = this.svc.filtered();
      if (this.ready) this.renderCharts(data);
    });
  }

  async ngOnInit() {
    try {
      const n = await this.svc.fetchData();
      if (n > 0) { this.done.set(true); this.status.set(`✓ ${this.svc.fileName() || 'Datos cargados'}`); }
    } catch { /* el upload mostrará el estado */ }
  }

  ngAfterViewInit() {
    this.ready = true;
    this.renderCharts(this.svc.filtered());
  }

  ngOnDestroy() {
    Object.values(this.charts).forEach(c => c.destroy());
  }

  // ── Filtros ───────────────────────────────────────────────────
  set(key: keyof EjecutivoFilters, e: Event) {
    const value = (e.target as HTMLInputElement | HTMLSelectElement).value;
    this.svc.patchFilters({ [key]: value });
    this.page.set(0);
  }

  // ── Métricas ──────────────────────────────────────────────────
  m = computed(() => {
    const data = this.svc.filtered();
    const resp = data.filter(r => r.sal === 'SI').length;
    const nresp = data.filter(r => r.sal === 'NO').length;
    const resDist = new Set(data.map(r => r.res).filter(Boolean)).size;
    const total = data.length;
    return {
      total, resp, nresp, resDist,
      respP: total ? (resp / total * 100).toFixed(1) : '0.0',
      nrespP: total ? (nresp / total * 100).toFixed(1) : '0.0'
    };
  });

  // ── Board de resoluciones ────────────────────────────────────
  resBoard = computed(() => {
    const data = this.svc.filtered();
    const counts: Record<string, number> = {};
    data.forEach(r => { const k = r.res || 'Sin dato'; counts[k] = (counts[k] || 0) + 1; });
    const total = data.length;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, pct: total ? (count / total * 100).toFixed(1) : '0.0' }));
  });

  color(i: number): string {
    return PALETTE[i % PALETTE.length];
  }

  // ── Tabla: orden y paginación ─────────────────────────────────
  private sortedRows = computed(() => {
    const key = this.sortKey();
    const dir = this.sortDir();
    return [...this.svc.filtered()].sort((a, b) => {
      let va: any = a[key], vb: any = b[key];
      if (va == null) va = '';
      if (vb == null) vb = '';
      if (typeof va === 'number' && typeof vb === 'number') return dir === 'asc' ? va - vb : vb - va;
      va = String(va); vb = String(vb);
      return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.sortedRows().length / this.pageSize)));

  pageRows = computed(() => {
    const sorted = this.sortedRows();
    const p = Math.min(this.page(), this.totalPages() - 1);
    const start = p * this.pageSize;
    return sorted.slice(start, start + this.pageSize);
  });

  pageInfo = computed(() => {
    const total = this.sortedRows().length;
    return `Página ${this.page() + 1} de ${this.totalPages()} · mostrando ${this.pageRows().length} de ${total}`;
  });

  onSort(key: SortKey) {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  prevPage() { if (this.page() > 0) this.page.update(p => p - 1); }
  nextPage() { if (this.page() < this.totalPages() - 1) this.page.update(p => p + 1); }

  // ── Upload ────────────────────────────────────────────────────
  onDragOver(e: DragEvent) { e.preventDefault(); this.drag.set(true); }
  onDrop(e: DragEvent) { e.preventDefault(); this.drag.set(false); this.loadFile(e.dataTransfer?.files?.[0]); }
  onPick(e: Event) { const i = e.target as HTMLInputElement; this.loadFile(i.files?.[0]); i.value = ''; }

  async loadFile(file?: File | null) {
    if (!file) return;
    this.done.set(true);
    this.status.set('⏳ Procesando ' + file.name + '…');
    try {
      const r = await this.svc.upload(file);
      this.svc.fileName.set(file.name);
      this.page.set(0);
      await this.svc.fetchData();
      this.status.set(`✓ ${file.name} — ${r.total} chats · ${r.respondidos} respondidos · ${r.resolucionesDistintas} resoluciones`);
    } catch (e: any) {
      this.done.set(false);
      alert('Error al subir: ' + (e?.error?.error || e?.message || e));
    }
  }

  // ── Gráficos (Chart.js) ───────────────────────────────────────
  private destroy(id: string) { if (this.charts[id]) { this.charts[id].destroy(); delete this.charts[id]; } }

  private renderCharts(rows: EjecutivoRow[]) {
    this.renderDonut(rows);
    this.renderBarDia(rows);
    this.renderGroupedDia(rows);
    this.renderHBarResolucion(rows);
  }

  private renderDonut(rows: EjecutivoRow[]) {
    if (!this.chartSalienteRef) return;
    this.destroy('sal');
    const resp = rows.filter(r => r.sal === 'SI').length;
    const nresp = rows.filter(r => r.sal === 'NO').length;
    this.charts['sal'] = new Chart(this.chartSalienteRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Respondido', 'No respondido'],
        datasets: [{ data: [resp, nresp], backgroundColor: ['#1D9E75', '#D85A30'], borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }]
      },
      options: {
        maintainAspectRatio: false, cutout: '68%',
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12, usePointStyle: true } } }
      }
    });
  }

  private renderBarDia(rows: EjecutivoRow[]) {
    if (!this.chartDiaRef) return;
    this.destroy('dia');
    const counts: Record<number, number> = {};
    rows.forEach(r => { if (!isNaN(r.dia)) counts[r.dia] = (counts[r.dia] || 0) + 1; });
    const dias = Object.keys(counts).map(Number).sort((a, b) => a - b);
    this.charts['dia'] = new Chart(this.chartDiaRef.nativeElement, {
      type: 'bar',
      data: { labels: dias.map(d => `Día ${d}`), datasets: [{ data: dias.map(d => counts[d]), backgroundColor: '#185FA5', borderRadius: 5, maxBarThickness: 40 }] },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 10 } }, beginAtZero: true }
        }
      }
    });
  }

  private renderGroupedDia(rows: EjecutivoRow[]) {
    if (!this.chartDiaSalienteRef) return;
    this.destroy('diaSal');
    const si: Record<number, number> = {}, no: Record<number, number> = {};
    rows.forEach(r => {
      if (isNaN(r.dia)) return;
      if (r.sal === 'SI') si[r.dia] = (si[r.dia] || 0) + 1; else no[r.dia] = (no[r.dia] || 0) + 1;
    });
    const dias = [...new Set([...Object.keys(si), ...Object.keys(no)].map(Number))].sort((a, b) => a - b);
    this.charts['diaSal'] = new Chart(this.chartDiaSalienteRef.nativeElement, {
      type: 'bar',
      data: {
        labels: dias.map(d => `Día ${d}`),
        datasets: [
          { label: 'Respondido', data: dias.map(d => si[d] || 0), backgroundColor: '#1D9E75', borderRadius: 4, maxBarThickness: 16 },
          { label: 'No respondido', data: dias.map(d => no[d] || 0), backgroundColor: '#D85A30', borderRadius: 4, maxBarThickness: 16 }
        ]
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, usePointStyle: true } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 10 } }, beginAtZero: true }
        }
      }
    });
  }

  private renderHBarResolucion(rows: EjecutivoRow[]) {
    if (!this.chartResolucionRef) return;
    this.destroy('res');
    const counts: Record<string, number> = {};
    rows.forEach(r => { const k = r.res || 'Sin dato'; counts[k] = (counts[k] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    this.charts['res'] = new Chart(this.chartResolucionRef.nativeElement, {
      type: 'bar',
      data: {
        labels: sorted.map(r => r[0]),
        datasets: [{ data: sorted.map(r => r[1]), backgroundColor: sorted.map((_, i) => this.color(i)), borderRadius: 4, maxBarThickness: 20 }]
      },
      options: {
        indexAxis: 'y', maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 10 } }, beginAtZero: true },
          y: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
      }
    });
  }
}

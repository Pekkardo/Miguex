import {
  AfterViewInit, Component, ElementRef, OnDestroy, OnInit,
  ViewChild, computed, effect, inject, signal
} from '@angular/core';
import { EggService } from '../services/egg.service';
import { AuthService } from '../services/auth.service';
import { EggFilters, EggRow, MESES } from '../models/egg.model';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const PALETTE = ['#1C7ED6', '#E03131', '#F08C00', '#7048E8', '#0CA678', '#E64980',
                 '#15AABF', '#FAB005', '#5C7CFA', '#37B24D', '#F76707', '#868E96'];
const VERDE = '#0CA678';
const ROJO = '#E03131';
const CELESTE = '#1C7ED6';

type SortKey = keyof EggRow;

@Component({
  selector: 'app-egg-dashboard',
  standalone: true,
  template: `
    <div class="dash">

      @if (auth.isAdmin()) {
        <div class="upload" [class.drag]="drag()" [class.done]="done()"
             (click)="fileInput.click()"
             (dragover)="onDragOver($event)" (dragleave)="drag.set(false)" (drop)="onDrop($event)">
          @if (!done()) {
            <p>💬 <strong>Subir Excel de chats</strong> — hacé clic o arrastrá acá</p>
            <p style="font-size:11px;margin-top:3px;color:var(--muted2)">Columnas: Fecha real, Dia, Mes, Telefono, Repetidos, Resolucion V2, salientes, Estado, Usuario</p>
          } @else {
            <p class="fn">{{ status() }}</p>
            <p style="font-size:11px;margin-top:2px;color:var(--muted)">Hacé clic o arrastrá para reemplazar</p>
          }
        </div>
        <input #fileInput type="file" accept=".xlsx,.xls" hidden (change)="onPick($event)">
      }

      <!-- FILTROS -->
      <div class="fbar">
        <span class="fbar-title">Filtros</span>
        <div class="filter-group"><label>Mes</label>
          <select [value]="f().mes" (change)="set('mes', $event)">
            <option value="">Todos</option>
            @for (m of svc.meses(); track m) { <option [value]="m">{{ mesName(m) }}</option> }
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
          <select [value]="f().saliente" (change)="set('saliente', $event)">
            <option value="">Todos</option><option value="SI">Sí</option><option value="NO">No</option>
          </select>
        </div>
        <div class="filter-group"><label>Repetidos</label>
          <select [value]="f().rep" (change)="set('rep', $event)">
            <option value="">Todos</option><option value="Único">Único</option><option value="Duplicado">Duplicado</option>
          </select>
        </div>
        <button class="reset-btn" (click)="svc.resetFilters(); page.set(1)">Limpiar filtros</button>
      </div>

      <!-- KPIs -->
      <div class="metrics metrics-4">
        <div class="metric"><div class="mlabel">Total de chats</div>
          <div class="mval">{{ kpi().total }}</div><div class="msub">en el período filtrado</div></div>
        <div class="metric g"><div class="mlabel">Respondidos</div>
          <div class="mval">{{ kpi().resp }}</div><div class="msub">{{ kpi().respSub }}</div></div>
        <div class="metric r"><div class="mlabel">No respondidos</div>
          <div class="mval">{{ kpi().noResp }}</div><div class="msub">{{ kpi().noRespSub }}</div></div>
        <div class="metric a"><div class="mlabel">Resoluciones distintas</div>
          <div class="mval">{{ kpi().resoluciones }}</div><div class="msub">tipificaciones activas</div></div>
      </div>

      <!-- CHARTS -->
      <div class="crow">
        <div class="card">
          <div class="ctitle">Respondidos vs. no respondidos <span>según "salientes"</span></div>
          <div style="height:230px;position:relative"><canvas #donutCanvas></canvas></div>
        </div>
        <div class="card">
          <div class="ctitle">Volumen por día <span>chats por día del mes</span></div>
          <div style="height:230px;position:relative"><canvas #diaCanvas></canvas></div>
        </div>
      </div>

      <div class="card">
        <div class="ctitle">Respondidos por día <span>comparativa diaria sí/no</span></div>
        <div style="height:230px;position:relative"><canvas #diaSalCanvas></canvas></div>
      </div>

      <!-- TABLERO DE RESOLUCIONES -->
      <div class="card">
        <div class="ctitle">Tablero de tipificaciones <span>de mayor a menor</span></div>
        @if (resBoard().length) {
          <div class="res-board">
            @for (r of resBoard(); track r.name) {
              <div class="res-card" [style.--c]="r.color">
                <div class="res-name">{{ r.name }}</div>
                <div class="res-count">{{ r.count }}</div>
                <div class="res-pct">{{ r.pct }}% del total</div>
              </div>
            }
          </div>
        } @else { <div class="empty">Sin datos para los filtros actuales.</div> }
      </div>

      <div class="card">
        <div class="ctitle">Distribución de resoluciones <span>todas las tipificaciones</span></div>
        <div style="height:320px;position:relative"><canvas #resCanvas></canvas></div>
      </div>

      <!-- DETALLE -->
      <div class="atcard">
        <div class="atcard-hdr">
          <div class="ctitle" style="margin:0">Detalle de chats <span>{{ svc.filtered().length }} chats</span></div>
          <input class="search-box" type="search" placeholder="Buscar teléfono, usuario, resolución…"
                 [value]="f().search" (input)="set('search', $event)">
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                @for (c of columns; track c.key) {
                  <th (click)="sortBy(c.key)" [class.sorted]="sortKey() === c.key" style="cursor:pointer">
                    {{ c.label }}@if (sortKey() === c.key) { <span>{{ sortDir() === 'asc' ? ' ▲' : ' ▼' }}</span> }
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (r of pageRows(); track $index) {
                <tr>
                  <td>{{ r['Fecha real'] }}</td>
                  <td>{{ r.Dia }}</td>
                  <td>{{ r.Telefono }}</td>
                  <td><span class="tag" [class.tag-unico]="r.Repetidos === 'Único'"
                            [class.tag-dup]="r.Repetidos !== 'Único'">{{ r.Repetidos }}</span></td>
                  <td>{{ r['Resolucion V2'] }}</td>
                  <td><span class="tag" [class.tag-si]="r.salientes === 'SI'"
                            [class.tag-no]="r.salientes !== 'SI'">{{ r.salientes === 'SI' ? 'Sí' : 'No' }}</span></td>
                  <td>{{ r.Estado }}</td>
                  <td>{{ r.Usuario }}</td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="empty">Sin chats para los filtros actuales.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <div class="pager">
          <span>{{ pageInfo() }}</span>
          <div>
            <button (click)="page.set(page() - 1)" [disabled]="page() <= 1">‹ Anterior</button>
            <button (click)="page.set(page() + 1)" [disabled]="page() >= totalPages()">Siguiente ›</button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .metrics-4{grid-template-columns:repeat(4,1fr)}
    .metric.r .mval{color:#E03131}
    .search-box{border:1px solid var(--border2);border-radius:6px;padding:6px 10px;font-size:12px;
      background:var(--bg);color:var(--text);outline:none;min-width:230px}
    .search-box:focus{border-color:var(--green)}
    .res-board{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
    .res-card{background:var(--bg);border:1px solid var(--border);border-left:4px solid var(--c);
      border-radius:var(--r);padding:12px 14px}
    .res-name{font-size:12px;font-weight:600;line-height:1.3;margin-bottom:8px;min-height:31px}
    .res-count{font-size:20px;font-weight:700;color:var(--c);letter-spacing:-.03em}
    .res-pct{font-size:11px;color:var(--muted);margin-top:2px}
    .table-scroll{max-height:520px;overflow:auto}
    thead th.sorted{color:var(--green)}
    .tag{padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;display:inline-block}
    .tag-si{background:var(--green-bg);color:var(--green)}
    .tag-no{background:#FDEAEA;color:#E03131}
    .tag-unico{background:var(--purple-bg);color:var(--purple)}
    .tag-dup{background:var(--amber-bg);color:var(--amber)}
    .pager{display:flex;justify-content:space-between;align-items:center;padding:11px 15px;
      border-top:1px solid var(--border);font-size:12px;color:var(--muted)}
    .pager button{background:var(--surface);border:1px solid var(--border2);color:var(--text);
      padding:5px 11px;border-radius:6px;cursor:pointer;font-size:12px;margin-left:5px}
    .pager button:disabled{opacity:.35;cursor:default}
    .pager button:hover:not(:disabled){border-color:var(--green);color:var(--green)}
  `]
})
export class EggDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly svc = inject(EggService);
  readonly auth = inject(AuthService);

  @ViewChild('donutCanvas') donutRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('diaCanvas') diaRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('diaSalCanvas') diaSalRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('resCanvas') resRef?: ElementRef<HTMLCanvasElement>;

  private charts: Record<string, Chart> = {};
  private viewReady = false;

  drag = signal(false);
  done = signal(false);
  status = signal('');
  page = signal(1);
  sortKey = signal<SortKey>('Fecha real');
  sortDir = signal<'asc' | 'desc'>('desc');
  readonly pageSize = 50;

  readonly columns: { key: SortKey; label: string }[] = [
    { key: 'Fecha real', label: 'Fecha' },
    { key: 'Dia', label: 'Día' },
    { key: 'Telefono', label: 'Teléfono' },
    { key: 'Repetidos', label: 'Repetidos' },
    { key: 'Resolucion V2', label: 'Resolución V2' },
    { key: 'salientes', label: 'Respondido' },
    { key: 'Estado', label: 'Estado chat' },
    { key: 'Usuario', label: 'Usuario' }
  ];

  f = computed(() => this.svc.filters());

  constructor() {
    // Redibuja los charts cada vez que cambia el conjunto filtrado.
    effect(() => {
      const rows = this.svc.filtered();
      if (this.viewReady) this.renderCharts(rows);
    });
  }

  async ngOnInit() {
    try {
      await this.svc.fetchData();
    } catch {
      // El interceptor ya maneja el 401; acá no hay nada que mostrar.
    }
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.renderCharts(this.svc.filtered());
  }

  ngOnDestroy() {
    Object.values(this.charts).forEach(c => c.destroy());
    this.charts = {};
  }

  mesName(m: number) { return MESES[m] ?? String(m); }

  set(key: keyof EggFilters, e: Event) {
    this.svc.patchFilters({ [key]: (e.target as HTMLInputElement).value } as Partial<EggFilters>);
    this.page.set(1);
  }

  sortBy(key: SortKey) {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  // ── KPIs ────────────────────────────────────────────────────────
  kpi = computed(() => {
    const rows = this.svc.filtered();
    const total = rows.length;
    const resp = rows.filter(r => r.salientes === 'SI').length;
    const noResp = rows.filter(r => r.salientes === 'NO').length;
    const pct = (n: number) => total ? `${(n / total * 100).toFixed(1)}% del total` : '—';
    return {
      total: total.toLocaleString('es-AR'),
      resp: resp.toLocaleString('es-AR'),
      respSub: pct(resp),
      noResp: noResp.toLocaleString('es-AR'),
      noRespSub: pct(noResp),
      resoluciones: new Set(rows.map(r => r['Resolucion V2'])).size.toLocaleString('es-AR')
    };
  });

  private resCounts = computed(() => {
    const m: Record<string, number> = {};
    this.svc.filtered().forEach(r => {
      const k = r['Resolucion V2'] || 'Sin dato';
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  });

  resBoard = computed(() => {
    const total = this.svc.filtered().length;
    return this.resCounts().map(([name, count], i) => ({
      name,
      count: count.toLocaleString('es-AR'),
      pct: total ? (count / total * 100).toFixed(1) : '0.0',
      color: PALETTE[i % PALETTE.length]
    }));
  });

  // ── Tabla ───────────────────────────────────────────────────────
  private sorted = computed(() => {
    const key = this.sortKey();
    const dir = this.sortDir();
    return [...this.svc.filtered()].sort((a, b) => {
      const va = a[key] ?? '';
      const vb = b[key] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') return dir === 'asc' ? va - vb : vb - va;
      return dir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.sorted().length / this.pageSize)));

  pageRows = computed(() => {
    const p = Math.min(this.page(), this.totalPages());
    const start = (p - 1) * this.pageSize;
    return this.sorted().slice(start, start + this.pageSize);
  });

  pageInfo = computed(() => {
    const p = Math.min(this.page(), this.totalPages());
    return `Página ${p} de ${this.totalPages()} · mostrando ${this.pageRows().length} de ${this.sorted().length}`;
  });

  // ── Upload ──────────────────────────────────────────────────────
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
      await this.svc.fetchData();
      this.status.set(`✓ ${file.name} — ${r.chats} chats · ${r.respondidos} respondidos · ${r.noRespondidos} sin responder`);
    } catch (e: any) {
      this.done.set(false);
      alert('Error al subir: ' + (e?.error?.error || e?.message || e));
    }
  }

  // ── Charts ──────────────────────────────────────────────────────
  private swap(id: string, ref: ElementRef<HTMLCanvasElement> | undefined, cfg: any) {
    if (!ref) return;
    this.charts[id]?.destroy();
    this.charts[id] = new Chart(ref.nativeElement, cfg);
  }

  private renderCharts(rows: EggRow[]) {
    const tooltip = { backgroundColor: '#0B2545', titleColor: '#fff', bodyColor: '#fff' };
    const axis = {
      x: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 10 } } },
      y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 10 } }, beginAtZero: true }
    };

    const resp = rows.filter(r => r.salientes === 'SI').length;
    const noResp = rows.filter(r => r.salientes === 'NO').length;

    this.swap('donut', this.donutRef, {
      type: 'doughnut',
      data: {
        labels: ['Respondido', 'No respondido'],
        datasets: [{ data: [resp, noResp], backgroundColor: [VERDE, ROJO], borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 14, usePointStyle: true } }, tooltip }
      }
    });

    const diaCounts: Record<number, number> = {};
    const diaSi: Record<number, number> = {};
    const diaNo: Record<number, number> = {};
    rows.forEach(r => {
      if (r.Dia == null) return;
      diaCounts[r.Dia] = (diaCounts[r.Dia] || 0) + 1;
      if (r.salientes === 'SI') diaSi[r.Dia] = (diaSi[r.Dia] || 0) + 1;
      else diaNo[r.Dia] = (diaNo[r.Dia] || 0) + 1;
    });
    const dias = Object.keys(diaCounts).map(Number).sort((a, b) => a - b);
    const labels = dias.map(d => `Día ${d}`);

    this.swap('dia', this.diaRef, {
      type: 'bar',
      data: { labels, datasets: [{ data: dias.map(d => diaCounts[d]), backgroundColor: CELESTE, borderRadius: 5, maxBarThickness: 46 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip }, scales: axis }
    });

    this.swap('diaSal', this.diaSalRef, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Respondido', data: dias.map(d => diaSi[d] || 0), backgroundColor: VERDE, borderRadius: 4, maxBarThickness: 18 },
          { label: 'No respondido', data: dias.map(d => diaNo[d] || 0), backgroundColor: ROJO, borderRadius: 4, maxBarThickness: 18 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, usePointStyle: true } }, tooltip },
        scales: axis
      }
    });

    const res = this.resCounts();
    this.swap('res', this.resRef, {
      type: 'bar',
      data: {
        labels: res.map(r => r[0]),
        datasets: [{
          data: res.map(r => r[1]),
          backgroundColor: res.map((_, i) => PALETTE[i % PALETTE.length]),
          borderRadius: 4, maxBarThickness: 22
        }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip },
        scales: {
          x: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 10 } }, beginAtZero: true },
          y: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
      }
    });
  }
}

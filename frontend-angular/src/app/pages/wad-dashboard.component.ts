import {
  AfterViewInit, Component, ElementRef, OnDestroy, OnInit,
  ViewChild, computed, effect, inject, signal
} from '@angular/core';
import { WadService } from '../services/wad.service';
import { AuthService } from '../services/auth.service';
import { DIA_ORDER, WadFilters, WadRow } from '../models/wad.model';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

type SortKey = 'chats' | 'mat' | 'conv' | 'cerr';

@Component({
  selector: 'app-wad-dashboard',
  standalone: true,
  template: `
    <div class="dash">

      <!-- UPLOAD -->
      @if (auth.isAdmin()) {
        <div class="upload" [class.drag]="drag()" [class.done]="done()"
             (click)="fileInput.click()"
             (dragover)="onDragOver($event)" (dragleave)="drag.set(false)" (drop)="onDrop($event)">
          @if (!done()) {
            <p>📱 <strong>Subir Excel</strong> — hacé clic o arrastrá acá</p>
            <p style="font-size:11px;margin-top:3px;color:var(--muted2)">Hoja: Detalle1 • Columnas: Estado Chat, Resoluciones Real, Dia, Matriculado real, Usuario</p>
          } @else {
            <p class="fn">{{ status() }}</p>
            <p style="font-size:11px;margin-top:2px;color:var(--muted)">Hacé clic o arrastrá para reemplazar</p>
          }
        </div>
        <input #fileInput type="file" accept=".xlsx,.xls" hidden (change)="onPick($event)">
      }

      <!-- FILTERS -->
      <div class="fbar">
        <span class="ftitle">Filtros</span>
        <div class="fg"><label>Desde</label><input type="date" [value]="f().desde" (change)="set('desde', $event)"></div>
        <div class="fg"><label>Hasta</label><input type="date" [value]="f().hasta" (change)="set('hasta', $event)"></div>
        <div class="fg"><label>Hora</label>
          <select [value]="f().hora" (change)="set('hora', $event)">
            <option value="">Todas</option>
            @for (h of svc.horas(); track h) { <option [value]="h">{{ h }}h</option> }
          </select>
        </div>
        <div class="fg"><label>Agente</label>
          <select [value]="f().ag" (change)="set('ag', $event)">
            <option value="">Todos</option>
            @for (a of svc.agents(); track a) { <option [value]="a">{{ a }}</option> }
          </select>
        </div>
        <div class="fg"><label>Estado</label>
          <div class="chips">
            @for (c of estadoChips; track c.v) {
              <span class="chip" [class.on]="f().estado === c.v" (click)="svc.patchFilters({ estado: c.v })">{{ c.l }}</span>
            }
          </div>
        </div>
        <div class="fg"><label>Día</label>
          <div class="chips">
            @for (c of diaChips; track c.v) {
              <span class="chip" [class.on]="f().dia === c.v" (click)="svc.patchFilters({ dia: c.v })">{{ c.l }}</span>
            }
          </div>
        </div>
        <div class="fg"><label>Mat.</label>
          <div class="chips">
            @for (c of matChips; track c.v) {
              <span class="chip" [class.on]="f().mat === c.v" (click)="svc.patchFilters({ mat: c.v })">{{ c.l }}</span>
            }
          </div>
        </div>
        <div class="fg"><label>Repetidos</label>
          <div class="chips">
            @for (c of repChips; track c.v) {
              <span class="chip" [class.on]="f().rep === c.v" (click)="svc.patchFilters({ rep: c.v })">{{ c.l }}</span>
            }
          </div>
        </div>
        <button class="rbtn" (click)="svc.resetFilters()">✕ Limpiar</button>
      </div>
      @if (summaryParts().length && svc.allRows().length) {
        <div class="fsumm on"><strong>{{ svc.filtered().length }} chats</strong> de {{ svc.allRows().length }} · {{ summaryParts().join(' · ') }}</div>
      }

      <!-- METRICS -->
      <div class="metrics">
        <div class="metric"><div class="mlabel">Total chats</div><div class="mval">{{ m().total }}</div><div class="msub">{{ m().totalSub }}</div></div>
        <div class="metric g"><div class="mlabel">Cerrados</div><div class="mval">{{ m().cerr }}</div><div class="msub">{{ m().total ? m().cerrP + '% del total' : '—' }}</div></div>
        <div class="metric a"><div class="mlabel">Abiertos</div><div class="mval">{{ m().ab }}</div><div class="msub">{{ m().total ? m().abP + '% del total' : '—' }}</div></div>
        <div class="metric p"><div class="mlabel">Matriculados</div><div class="mval">{{ m().mat }}</div><div class="msub">de {{ m().total }} chats</div></div>
        <div class="metric b"><div class="mlabel">Prom. diario</div><div class="mval">{{ m().avgDaily }}</div><div class="msub">chats / día</div></div>
        <div class="conv-card"><div class="mlabel">Conversión</div><div class="mval">{{ m().conv }}</div><div class="msub">{{ m().mat }} mat ÷ {{ m().total }}</div></div>
      </div>

      <!-- FECHA + HORA -->
      <div class="crow">
        <div class="card">
          <div class="ctitle">Chats por fecha
            <div class="legend" style="margin:0">
              <span class="leg"><span class="ldot" style="background:#34B7F1"></span>Chats</span>
              <span class="leg"><span class="ldot" style="background:#7F77DD"></span>Matr.</span>
            </div>
          </div>
          <div class="dchart"><canvas #fechaCanvas></canvas></div>
        </div>
        <div class="card">
          <div class="ctitle">Chats por hora <span>{{ peakNote() }}</span></div>
          <div class="bars">
            @if (svc.filtered().length) {
              @for (b of hourBars().bars; track b.h) {
                <div class="brow"><span class="blbl">{{ b.h }}h</span><div class="btrack"><div class="bfill" [style.width.%]="b.w" [style.background]="b.peak ? '#075E54' : '#34B7F1'"></div></div><span class="bcnt">{{ b.c }}</span></div>
              }
            } @else { <div class="empty">Cargá un archivo</div> }
          </div>
        </div>
      </div>

      <!-- DIA + ESTADO -->
      <div class="crow">
        <div class="card">
          <div class="ctitle">Chats por día de semana</div>
          <div class="bars">
            @if (svc.filtered().length) {
              @for (d of diaBars(); track d.d) {
                <div class="brow"><span class="blbl-w" style="width:60px">{{ d.d }}</span><div class="btrack"><div class="bfill" [style.width.%]="d.w" style="background:#34B7F1"></div></div><span class="bcnt">{{ d.c }}</span></div>
              }
            } @else { <div class="empty">Cargá un archivo</div> }
          </div>
        </div>
        <div class="card">
          <div class="ctitle">Estado de chat</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
            @if (svc.filtered().length) {
              <div class="estado-card cerrado"><div class="estado-icon">✅</div><div class="estado-info"><div class="val">{{ estado().cerr }}</div><div class="lbl">Cerrados • {{ estado().cerrP }}%</div></div></div>
              <div class="estado-card abierto"><div class="estado-icon">⏳</div><div class="estado-info"><div class="val">{{ estado().ab }}</div><div class="lbl">Abiertos • {{ estado().abP }}%</div></div></div>
            } @else { <div class="empty" style="grid-column:1/-1">Cargá un archivo</div> }
          </div>
          <div class="ctitle" style="margin-top:4px">Matr. por día de semana</div>
          <div class="bars">
            @for (d of matDiaBars(); track d.d) {
              <div class="brow"><span class="blbl-w" style="width:60px">{{ d.d }}</span><div class="btrack"><div class="bfill" [style.width.%]="d.w" style="background:#7F77DD"></div></div><span class="bcnt">{{ d.c }}</span></div>
            }
          </div>
        </div>
      </div>

      <!-- RESOLUCIONES -->
      <div class="card">
        <div class="ctitle">Resoluciones (top 10) <span>{{ resBars().count }} resoluciones</span></div>
        <div class="bars">
          @if (resBars().bars.length) {
            @for (r of resBars().bars; track r.l) {
              <div class="brow"><span class="blbl-w">{{ r.l }}</span><div class="btrack"><div class="bfill" [style.width.%]="r.w" style="background:#F59E0B"></div></div><span class="bcnt">{{ r.c }}</span></div>
            }
          } @else { <div class="empty">Cargá un archivo</div> }
        </div>
      </div>

      <!-- CONV TABLE -->
      <div class="card">
        <div class="ctitle">Conversión por día <span>clic en fila para filtrar</span></div>
        <div style="overflow-x:auto">
          <table class="convtable">
            <thead><tr><th>Fecha</th><th>Día</th><th>Chats</th><th>Cerrados</th><th>Abiertos</th><th>Matriculados</th><th>Conv. %</th></tr></thead>
            <tbody>
              @if (convRows().length) {
                @for (r of convRows(); track r.dk) {
                  <tr (click)="svc.filterByDate(r.dk)">
                    <td>{{ r.label }}</td><td>{{ r.dia }}</td><td>{{ r.total }}</td><td>{{ r.cerr }}</td><td>{{ r.ab }}</td>
                    <td>@if (r.mat > 0) { <span class="mpill">{{ r.mat }}</span> } @else { — }</td>
                    <td><span [class]="r.cls">{{ r.conv }}%</span></td>
                  </tr>
                }
              } @else { <tr><td colspan="7" class="empty" style="text-align:center">Cargá un archivo</td></tr> }
            </tbody>
          </table>
        </div>
      </div>

      <!-- AGENTS -->
      <div class="atcard">
        <div class="atcard-hdr">
          <div class="ctitle" style="margin:0">Rendimiento por agente</div>
          <select [value]="sort()" (change)="sort.set($any($event.target).value)"
                  style="font-size:11px;border:1px solid var(--border2);border-radius:6px;padding:3px 7px;background:var(--bg);cursor:pointer;outline:none">
            <option value="chats">Por chats</option>
            <option value="mat">Por matriculados</option>
            <option value="conv">Por conversión</option>
            <option value="cerr">Por cierre</option>
          </select>
        </div>
        <table class="ag">
          <thead><tr><th>#</th><th>Agente</th><th>Chats</th><th>Cerrados</th><th>% Cierre</th><th>Matriculados</th><th>Conv. %</th></tr></thead>
          <tbody>
            @if (agents().length) {
              @for (a of agents(); track a.name) {
                <tr (click)="svc.toggleAgent(a.name)">
                  <td><span class="rank" [class.top]="a.top">{{ a.rank }}</span></td>
                  <td>{{ a.name }}</td><td>{{ a.chats }}</td><td>{{ a.cerr }}</td><td>{{ a.cierre }}</td>
                  <td>@if (a.mat > 0) { <span class="mpill">{{ a.mat }}</span> } @else { — }</td>
                  <td>{{ a.conv }}</td>
                </tr>
              }
            } @else { <tr><td colspan="7" class="empty" style="text-align:center;padding:16px">Cargá un archivo</td></tr> }
          </tbody>
        </table>
      </div>

    </div>
  `,
  styles: [`
    :host{
      display:block;
      --teal:#075E54;--green:#25D366;--green-dark:#128C7E;--green-bg:#E8F9EF;
      --coral-bg:#FDEEE9;--muted2:#aaa;
    }
    .upload{border:1.5px dashed var(--border2);border-radius:var(--rl);padding:18px;text-align:center;cursor:pointer;background:var(--surface);transition:.15s}
    .upload:hover,.upload.drag{border-color:var(--green-dark);background:var(--green-bg)}
    .upload.done{border-style:solid;border-color:var(--green-dark);padding:10px 18px}
    .upload p{font-size:13px;color:var(--muted)}
    .upload .fn{font-size:13px;font-weight:600;color:var(--green-dark)}

    .fbar{background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);padding:11px 14px;display:flex;flex-wrap:wrap;gap:9px;align-items:center}
    .ftitle{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
    .fg{display:flex;align-items:center;gap:5px}
    .fg label{font-size:12px;color:var(--muted)}
    .fbar select,.fbar input[type=date]{font-size:12px;border:1px solid var(--border2);border-radius:6px;padding:4px 8px;background:var(--bg);color:var(--text);cursor:pointer;outline:none}
    .fbar select:focus,.fbar input[type=date]:focus{border-color:var(--green-dark)}
    .chips{display:flex;gap:4px;flex-wrap:wrap}
    .chip{font-size:11px;padding:3px 9px;border-radius:99px;border:1px solid var(--border2);background:var(--bg);color:var(--muted);cursor:pointer;white-space:nowrap;user-select:none;transition:.12s}
    .chip:hover{border-color:var(--green-dark);color:var(--green-dark)}
    .chip.on{background:var(--teal);color:#fff;border-color:var(--teal)}
    .rbtn{font-size:12px;padding:4px 9px;border-radius:6px;border:1px solid var(--border2);background:var(--bg);color:var(--muted);cursor:pointer;margin-left:auto}
    .rbtn:hover{border-color:var(--coral);color:var(--coral)}
    .fsumm{font-size:12px;color:var(--muted);padding:2px 0}
    .fsumm strong{color:var(--text)}

    .metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:9px}
    .metric{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:11px 13px}
    .mlabel{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px}
    .mval{font-size:22px;font-weight:700;letter-spacing:-.03em}
    .msub{font-size:11px;color:var(--muted);margin-top:2px}
    .metric.g .mval{color:var(--green-dark)}
    .metric.a .mval{color:var(--amber)}
    .metric.p .mval{color:var(--purple)}
    .metric.b .mval{color:var(--blue)}
    .conv-card{background:linear-gradient(135deg,var(--teal),#0a8a7a);border-radius:var(--r);padding:11px 13px}
    .conv-card .mlabel{color:rgba(255,255,255,.7);font-size:10px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px}
    .conv-card .mval{font-size:22px;font-weight:700;color:#fff;letter-spacing:-.03em}
    .conv-card .msub{font-size:11px;color:rgba(255,255,255,.75);margin-top:2px}

    .crow{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);padding:13px 15px}
    .ctitle{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between}
    .ctitle span{font-weight:400;color:var(--muted2)}
    .dchart{height:150px}
    .legend{display:flex;gap:12px;margin-bottom:7px;flex-wrap:wrap}
    .leg{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--muted)}
    .ldot{width:9px;height:9px;border-radius:2px;flex-shrink:0}

    .bars{display:flex;flex-direction:column;gap:5px}
    .brow{display:flex;align-items:center;gap:6px}
    .blbl{font-size:11px;color:var(--muted);width:26px;text-align:right;flex-shrink:0}
    .blbl-w{font-size:11px;color:var(--muted);width:200px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .btrack{flex:1;background:var(--bg);border-radius:3px;height:11px;overflow:hidden}
    .bfill{height:100%;border-radius:3px;transition:width .4s ease}
    .bcnt{font-size:11px;color:var(--muted);width:36px;flex-shrink:0;text-align:right}

    .estado-card{border-radius:var(--r);padding:14px 16px;display:flex;align-items:center;gap:12px}
    .estado-card.cerrado{background:var(--green-bg);border:1px solid rgba(18,140,126,.2)}
    .estado-card.abierto{background:var(--amber-bg);border:1px solid rgba(186,117,23,.2)}
    .estado-icon{font-size:24px}
    .estado-info .val{font-size:26px;font-weight:700;letter-spacing:-.03em}
    .estado-card.cerrado .val{color:var(--green-dark)}
    .estado-card.abierto .val{color:var(--amber)}
    .estado-info .lbl{font-size:12px;color:var(--muted);margin-top:2px}

    .convtable{width:100%;border-collapse:collapse;font-size:12px}
    .convtable th{padding:6px 10px;text-align:left;font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--border);background:var(--bg)}
    .convtable th:not(:first-child){text-align:right}
    .convtable td{padding:7px 10px;border-bottom:1px solid var(--border)}
    .convtable td:not(:first-child){text-align:right;color:var(--muted)}
    .convtable tr:last-child td{border-bottom:none}
    .convtable tr:hover td{background:var(--bg);cursor:pointer}
    .pct-hi{background:var(--green-bg);color:var(--green-dark);font-size:10px;font-weight:600;padding:2px 7px;border-radius:99px;display:inline-block}
    .pct-mid{background:var(--amber-bg);color:var(--amber);font-size:10px;font-weight:600;padding:2px 7px;border-radius:99px;display:inline-block}
    .pct-lo{background:#f0f0ee;color:var(--muted);font-size:10px;font-weight:600;padding:2px 7px;border-radius:99px;display:inline-block}
    .mpill{background:var(--purple-bg);color:var(--purple);font-size:10px;font-weight:600;padding:1px 6px;border-radius:99px;display:inline-block}

    .atcard{background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);overflow:hidden}
    .atcard-hdr{padding:11px 14px 7px;display:flex;align-items:center;justify-content:space-between}
    table.ag{width:100%;border-collapse:collapse;font-size:12px}
    table.ag thead th{padding:6px 11px;text-align:left;font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border);background:var(--bg)}
    table.ag thead th:not(:first-child){text-align:right}
    table.ag tbody td{padding:7px 11px;border-bottom:1px solid var(--border)}
    table.ag tbody td:not(:first-child){text-align:right;color:var(--muted)}
    table.ag tbody tr:last-child td{border-bottom:none}
    table.ag tbody tr:hover td{background:var(--bg);cursor:pointer}
    .rank{display:inline-flex;width:18px;height:18px;align-items:center;justify-content:center;border-radius:4px;font-size:10px;font-weight:700;background:var(--bg);color:var(--muted)}
    .rank.top{background:var(--green-bg);color:var(--green-dark)}
    .empty{color:var(--muted2);font-size:12px;text-align:center;padding:20px 0}
  `]
})
export class WadDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  svc = inject(WadService);
  readonly auth = inject(AuthService);
  f = this.svc.filters;

  @ViewChild('fechaCanvas') canvasRef?: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;
  private ready = false;

  // upload state
  drag = signal(false);
  done = signal(false);
  status = signal('');

  sort = signal<SortKey>('chats');

  estadoChips = [{ v: '', l: 'Todos' }, { v: 'Cerrado', l: 'Cerrado' }, { v: 'Abierto', l: 'Abierto' }];
  diaChips = [
    { v: '', l: 'Todos' }, { v: 'Lunes', l: 'Lun' }, { v: 'Martes', l: 'Mar' },
    { v: 'Miércoles', l: 'Mié' }, { v: 'Jueves', l: 'Jue' }, { v: 'Viernes', l: 'Vie' },
    { v: 'Sábado', l: 'Sáb' }, { v: 'Domingo', l: 'Dom' }
  ];
  matChips = [{ v: '', l: 'Todos' }, { v: '1', l: 'Matriculados' }, { v: '0', l: 'No matr.' }];
  repChips = [{ v: '', l: 'Todos' }, { v: '1', l: 'Duplicados' }, { v: '0', l: 'Únicos' }];

  constructor() {
    effect(() => {
      const data = this.svc.filtered();
      if (this.ready) this.renderChart(data);
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
    this.renderChart(this.svc.filtered());
  }

  ngOnDestroy() { this.chart?.destroy(); }

  // ── Filtros ───────────────────────────────────────────────────
  set(key: keyof WadFilters, e: Event) {
    const value = (e.target as HTMLInputElement | HTMLSelectElement).value;
    this.svc.patchFilters({ [key]: value });
  }

  summaryParts = computed<string[]>(() => {
    const f = this.f();
    const out: string[] = [];
    if (f.desde || f.hasta) out.push((f.desde ? f.desde.slice(8) + '/' + f.desde.slice(5, 7) : 'inicio') + ' → ' + (f.hasta ? f.hasta.slice(8) + '/' + f.hasta.slice(5, 7) : 'hoy'));
    if (f.hora !== '') out.push('Hora ' + f.hora + 'h');
    if (f.ag) out.push(f.ag);
    if (f.estado) out.push(f.estado);
    if (f.dia) out.push(f.dia);
    if (f.mat === '1') out.push('Solo matriculados');
    if (f.mat === '0') out.push('No matriculados');
    if (f.rep === '1') out.push('Solo duplicados');
    if (f.rep === '0') out.push('Solo únicos');
    return out;
  });

  // ── Métricas ──────────────────────────────────────────────────
  m = computed(() => {
    const data = this.svc.filtered();
    let cerr = 0, ab = 0, mat = 0;
    const dkSet = new Set<string>();
    data.forEach(r => { if (r.ec === 'Cerrado') cerr++; else ab++; if (r.mat) mat++; dkSet.add(r.dk); });
    const days = dkSet.size || 1;
    const raw = this.svc.allRows().length;
    return {
      total: data.length, cerr, ab, mat,
      cerrP: data.length ? Math.round(cerr / data.length * 100) : 0,
      abP: data.length ? Math.round(ab / data.length * 100) : 0,
      avgDaily: Math.round(data.length / days),
      conv: data.length ? ((mat / data.length) * 100).toFixed(1) + '%' : '—',
      totalSub: (raw && data.length < raw) ? `de ${raw} total` : 'chats totales'
    };
  });

  // ── Hora ──────────────────────────────────────────────────────
  private hourModel = computed(() => {
    const hm: Record<number, number> = {};
    this.svc.filtered().forEach(r => { if (!isNaN(r.h) && r.h >= 8 && r.h <= 21) hm[r.h] = (hm[r.h] || 0) + 1; });
    let peakH: number | null = null, peakV = 0;
    Object.keys(hm).forEach(k => { if (hm[+k] > peakV) { peakV = hm[+k]; peakH = +k; } });
    const max = peakV || 1;
    const bars = [];
    for (let h = 8; h <= 21; h++) { const c = hm[h] || 0; bars.push({ h, c, w: Math.round(c / max * 100), peak: peakH === h }); }
    return { bars, peakH };
  });
  hourBars = computed(() => this.hourModel());
  peakNote = computed(() => { const p = this.hourModel().peakH; return p != null ? 'pico ' + p + 'h' : ''; });

  // ── Día ───────────────────────────────────────────────────────
  diaBars = computed(() => {
    const dm: Record<string, number> = {};
    this.svc.filtered().forEach(r => dm[r.dia] = (dm[r.dia] || 0) + 1);
    const max = Math.max(...DIA_ORDER.map(d => dm[d] || 0), 1);
    return DIA_ORDER.map(d => ({ d, c: dm[d] || 0, w: Math.round((dm[d] || 0) / max * 100) }));
  });

  matDiaBars = computed(() => {
    const dm: Record<string, number> = {};
    this.svc.filtered().forEach(r => { if (r.mat) dm[r.dia] = (dm[r.dia] || 0) + 1; });
    const max = Math.max(...DIA_ORDER.map(d => dm[d] || 0), 1);
    return DIA_ORDER.map(d => ({ d, c: dm[d] || 0, w: Math.round((dm[d] || 0) / max * 100) }));
  });

  // ── Estado ────────────────────────────────────────────────────
  estado = computed(() => {
    const data = this.svc.filtered();
    let cerr = 0, ab = 0;
    data.forEach(r => { if (r.ec === 'Cerrado') cerr++; else if (r.ec === 'Abierto') ab++; });
    return { cerr, ab, cerrP: data.length ? Math.round(cerr / data.length * 100) : 0, abP: data.length ? Math.round(ab / data.length * 100) : 0 };
  });

  // ── Resoluciones ──────────────────────────────────────────────
  resBars = computed(() => {
    const rm: Record<string, number> = {};
    this.svc.filtered().forEach(r => { if (r.res) rm[r.res] = (rm[r.res] || 0) + 1; });
    const entries = Object.entries(rm).sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 10);
    const max = top.length ? top[0][1] : 1;
    return { count: entries.length, bars: top.map(([l, c]) => ({ l, c, w: Math.round(c / max * 100) })) };
  });

  // ── Conversión por día ────────────────────────────────────────
  convRows = computed(() => {
    const dm: Record<string, { total: number; cerr: number; ab: number; mat: number; dia: string }> = {};
    this.svc.filtered().forEach(r => {
      (dm[r.dk] ??= { total: 0, cerr: 0, ab: 0, mat: 0, dia: r.dia });
      dm[r.dk].total++; dm[r.dk].mat += r.mat;
      if (r.ec === 'Cerrado') dm[r.dk].cerr++; else dm[r.dk].ab++;
    });
    return Object.keys(dm).sort().map(dk => {
      const d = dm[dk];
      const conv = d.total ? ((d.mat / d.total) * 100).toFixed(1) : '0';
      const cls = parseFloat(conv) >= 1 ? 'pct-hi' : parseFloat(conv) > 0 ? 'pct-mid' : 'pct-lo';
      return { dk, label: dk.slice(8) + '/' + dk.slice(5, 7), dia: d.dia, total: d.total, cerr: d.cerr, ab: d.ab, mat: d.mat, conv, cls };
    });
  });

  // ── Agentes ───────────────────────────────────────────────────
  agents = computed(() => {
    const am: Record<string, { chats: number; cerr: number; mat: number }> = {};
    this.svc.filtered().forEach(r => {
      (am[r.ag] ??= { chats: 0, cerr: 0, mat: 0 });
      am[r.ag].chats++; if (r.ec === 'Cerrado') am[r.ag].cerr++; if (r.mat) am[r.ag].mat++;
    });
    const arr = Object.entries(am).map(([name, a]) => ({ name, ...a }));
    const s = this.sort();
    arr.sort((a, b) => {
      if (s === 'chats') return b.chats - a.chats;
      if (s === 'mat') return b.mat - a.mat;
      if (s === 'conv') return (b.chats ? b.mat / b.chats : 0) - (a.chats ? a.mat / a.chats : 0);
      if (s === 'cerr') return (b.chats ? b.cerr / b.chats : 0) - (a.chats ? a.cerr / a.chats : 0);
      return 0;
    });
    return arr.slice(0, 15).map((a, i) => ({
      ...a, rank: i + 1, top: i < 3,
      cierre: a.chats ? Math.round(a.cerr / a.chats * 100) + '%' : '—',
      conv: a.chats ? ((a.mat / a.chats) * 100).toFixed(1) + '%' : '—'
    }));
  });

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
      await this.svc.fetchData();
      this.status.set(`✓ ${file.name} — ${r.chats} chats · ${r.cerrados} cerrados · ${r.matriculados} matriculados`);
    } catch (e: any) {
      this.done.set(false);
      alert('Error al subir: ' + (e?.error?.error || e?.message || e));
    }
  }

  // ── Chart de fechas ───────────────────────────────────────────
  private renderChart(rows: WadRow[]) {
    if (!this.canvasRef) return;
    const dm: Record<string, number> = {}, mm: Record<string, number> = {};
    const labelToIso: Record<string, string> = {};
    rows.forEach(r => {
      if (!r.dk) return;
      const k = r.dk.slice(8) + '/' + r.dk.slice(5, 7);
      dm[k] = (dm[k] || 0) + 1;
      if (r.mat) mm[k] = (mm[k] || 0) + 1;
      labelToIso[k] = r.dk;
    });
    const labels = Object.keys(dm).sort((a, b) => labelToIso[a].localeCompare(labelToIso[b]));

    this.chart?.destroy();
    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Chats', data: labels.map(k => dm[k] || 0), backgroundColor: '#34B7F1', borderRadius: 3, borderSkipped: false },
          { label: 'Matr.', data: labels.map(k => mm[k] || 0), backgroundColor: '#7F77DD', borderRadius: 3, borderSkipped: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45, autoSkip: false } },
          y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 9 } }, beginAtZero: true }
        },
        onClick: (_evt, els) => {
          if (!els.length) return;
          const iso = labelToIso[labels[els[0].index]];
          if (iso) this.svc.filterByDate(iso);
        }
      }
    });
  }
}

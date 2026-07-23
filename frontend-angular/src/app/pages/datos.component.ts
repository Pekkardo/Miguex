import { Component, LOCALE_ID, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { DatosService } from '../services/datos.service';
import { AuthService } from '../services/auth.service';
import { Canal, CanalSlug, DatosRow } from '../models/datos.model';

registerLocaleData(localeEsAr);

interface BarItem { label: string; value: number; pct: number; }
interface Cells {
  c0800: number; cLeads: number; cChats: number; total: number;
  tm0800: number; tmLeads: number; tmChats: number; tmTotal: number;
  tt0800: number; ttLeads: number; ttChats: number; ttTotal: number;
}
interface FechaRow { fecha: string; dia: string; cells: Cells; }
interface WeekRow { semana: string; cells: Cells; fechas: FechaRow[]; }

const DIA_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MES_NOMBRE: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
  7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
};
const CANALES: Canal[] = ['0800', 'Leads', 'Chats'];

function emptyCells(): Cells {
  return {
    c0800: 0, cLeads: 0, cChats: 0, total: 0,
    tm0800: 0, tmLeads: 0, tmChats: 0, tmTotal: 0,
    tt0800: 0, ttLeads: 0, ttChats: 0, ttTotal: 0
  };
}
function addTo(c: Cells, r: DatosRow) {
  const tm = r.turno === 'Mañana', tt = r.turno === 'Tarde';
  if (r.canal === '0800') { c.c0800++; if (tm) c.tm0800++; if (tt) c.tt0800++; }
  else if (r.canal === 'Leads') { c.cLeads++; if (tm) c.tmLeads++; if (tt) c.ttLeads++; }
  else { c.cChats++; if (tm) c.tmChats++; if (tt) c.ttChats++; }
  c.total++; if (tm) c.tmTotal++; if (tt) c.ttTotal++;
}
function sumInto(dst: Cells, s: Cells) {
  dst.c0800 += s.c0800; dst.cLeads += s.cLeads; dst.cChats += s.cChats; dst.total += s.total;
  dst.tm0800 += s.tm0800; dst.tmLeads += s.tmLeads; dst.tmChats += s.tmChats; dst.tmTotal += s.tmTotal;
  dst.tt0800 += s.tt0800; dst.ttLeads += s.ttLeads; dst.ttChats += s.ttChats; dst.ttTotal += s.ttTotal;
}

@Component({
  selector: 'app-datos',
  standalone: true,
  template: `
  <div class="datos">

    @if (auth.isAdmin()) {
      <div class="panel upload-panel">
        <div class="filters-title">CARGA DE ARCHIVOS (ADMIN)</div>
        <div class="uploads">
          @for (u of UPLOADS; track u.slug) {
            <div class="up-card">
              <div class="up-head">
                <span class="up-icon" [style.background]="u.color">{{ u.icon }}</span>
                <div>
                  <b>{{ u.label }}</b>
                  <span class="up-sub">{{ svc.countByCanal()[u.canal] | number }} filas cargadas</span>
                </div>
              </div>
              <label class="file-label" [style.background]="u.color">
                📤 Subir {{ u.label }} (.xlsx)
                <input type="file" accept=".xlsx,.xls" (change)="onUpload(u.slug, $event)">
              </label>
              @if (status()[u.slug]; as st) {
                <div class="up-msg" [class.ok]="st.ok" [class.err]="!st.ok">{{ st.msg }}</div>
              }
            </div>
          }
        </div>
      </div>
    }

    <div class="panel">
      <div class="filters-title">FILTROS</div>
      <div class="filters-row">
        <div class="field">
          <label>Semana</label>
          <select [value]="fSemana()" (change)="fSemana.set($any($event.target).value)">
            <option value="">Todas</option>
            @for (s of semanas(); track s) { <option [value]="s">{{ s }}</option> }
          </select>
        </div>
        <div class="field">
          <label>Turno</label>
          <select [value]="fTurno()" (change)="fTurno.set($any($event.target).value)">
            <option value="">Todos</option>
            @for (t of turnos(); track t) { <option [value]="t">{{ t }}</option> }
          </select>
        </div>
        <div class="field">
          <label>Canal</label>
          <select [value]="fCanal()" (change)="fCanal.set($any($event.target).value)">
            <option value="">Todos</option>
            @for (c of CANALES; track c) { <option [value]="c">{{ c }}</option> }
          </select>
        </div>
        <div class="field">
          <label>Día</label>
          <select [value]="fDia()" (change)="fDia.set($any($event.target).value)">
            <option value="">Todos</option>
            @for (d of dias(); track d) { <option [value]="d">{{ d }}</option> }
          </select>
        </div>
        <div class="field">
          <label>Mes</label>
          <select [value]="fMes()" (change)="fMes.set($any($event.target).value)">
            <option value="">Todos</option>
            @for (m of meses(); track m) { <option [value]="m">{{ mesNombre(m) }}</option> }
          </select>
        </div>
        <div class="field">
          <label>Día del mes</label>
          <select [value]="fDiaMes()" (change)="fDiaMes.set($any($event.target).value)">
            <option value="">Todos</option>
            @for (d of diasMes(); track d) { <option [value]="d">{{ d }}</option> }
          </select>
        </div>
        <div class="field">
          <label>&nbsp;</label>
          <button class="btn clear" (click)="limpiar()">Limpiar filtros</button>
        </div>
      </div>
    </div>

    <div class="kpis" [style.grid-template-columns]="'repeat(' + cards().length + ',minmax(0,1fr))'">
      @for (card of cards(); track card.canal) {
        <div class="kpi">
          <div class="icon" [style.background]="card.color">{{ card.icon }}</div>
          <div>
            <div class="label">{{ card.label }}</div>
            <div class="value">{{ card.value | number }}</div>
            <div class="sub">contactos en el filtro actual</div>
          </div>
        </div>
      }
    </div>

    @for (bk of breakdowns(); track bk.canal) {
      <div class="panel bk-block">
        <div class="bk-title">CANAL {{ bk.canal | uppercase }}</div>
        <div class="grid3">
          <div class="breakdown">
            <h3>POR TURNO</h3>
            <ng-container [ngTemplateOutlet]="barsTpl" [ngTemplateOutletContext]="{ $implicit: bk.turno }"></ng-container>
          </div>
          <div class="breakdown">
            <h3>POR DÍA</h3>
            <ng-container [ngTemplateOutlet]="barsTpl" [ngTemplateOutletContext]="{ $implicit: bk.dia }"></ng-container>
          </div>
          <div class="breakdown">
            <h3>POR SEMANA</h3>
            <ng-container [ngTemplateOutlet]="barsTpl" [ngTemplateOutletContext]="{ $implicit: bk.semana }"></ng-container>
          </div>
        </div>
      </div>
    }

    <div class="table-panel">
      <div class="table-head">
        <span>DETALLE POR SEMANA</span>
        <span class="count">{{ table().weeks.length }} semanas · clic en una fila para ver por fecha</span>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th class="left sortable" rowspan="2" (click)="sort('semana')">SEMANA{{ arrow('semana') }}</th>
              @for (g of headerGroups(); track g.name) {
                <th [attr.colspan]="g.span" class="grp" [ngClass]="g.cls">{{ g.name }}</th>
              }
            </tr>
            <tr>
              @for (col of cols(); track col.key) {
                <th class="sortable" [class.grp]="col.groupStart" [class.strong]="col.strong" (click)="sort(col.key)">{{ col.label }}{{ arrow(col.key) }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (w of table().weeks; track w.semana) {
              <tr class="week-row" [class.open]="expanded().has(w.semana)" (click)="toggle(w.semana)">
                <td class="left">
                  <span class="caret">{{ expanded().has(w.semana) ? '▾' : '▸' }}</span> {{ w.semana }}
                </td>
                @for (col of cols(); track col.key) {
                  <td [ngClass]="col.tdcls" [class.strong]="col.strong">
                    @if (col.pill) {
                      <span class="total-pill">{{ cellVal(w.cells, col.key) | number }}</span>
                    } @else {
                      {{ cellVal(w.cells, col.key) | number }}
                    }
                  </td>
                }
              </tr>
              @if (expanded().has(w.semana)) {
                @for (f of w.fechas; track f.fecha) {
                  <tr class="detail-row">
                    <td class="left detail-fecha">{{ formatFecha(f.fecha) }} · {{ f.dia }}</td>
                    @for (col of cols(); track col.key) {
                      <td [ngClass]="col.tdcls" [class.strong]="col.strong">{{ cellVal(f.cells, col.key) | number }}</td>
                    }
                  </tr>
                }
              }
            } @empty {
              <tr><td class="empty" [attr.colspan]="colCount()">No hay datos para el filtro actual. Subí los Excel desde el panel de carga.</td></tr>
            }
          </tbody>
          @if (table().weeks.length) {
            <tfoot>
              <tr>
                <td class="left">TOTAL</td>
                @for (col of cols(); track col.key) {
                  <td [ngClass]="col.tdcls" [class.strong]="col.strong">{{ cellVal(table().totals, col.key) | number }}</td>
                }
              </tr>
            </tfoot>
          }
        </table>
      </div>
    </div>

  </div>

  <ng-template #barsTpl let-items>
    @for (b of items; track b.label) {
      <div class="bar-row">
        <div class="bar-lab">{{ b.label }}</div>
        <div class="bar-track"><div class="bar-fill" [style.width.%]="b.pct"></div></div>
        <div class="bar-val">{{ b.value | number }}</div>
      </div>
    } @empty {
      <div class="bar-empty">sin datos</div>
    }
  </ng-template>
  `,
  styles: [`
    :host{
      --navy:#0f1f3d;--blue:#2563eb;--green:#0f9d58;--red:#e11d48;--orange:#f59e0b;--purple:#7c3aed;
      --bg:#eef1f6;--card:#fff;--border:#e2e6ee;--text:#1f2937;--muted:#6b7280;
      display:block;background:var(--bg);color:var(--text);min-height:calc(100vh - 52px);
      padding:20px 24px 60px;font-family:Arial,Helvetica,sans-serif;
    }
    .datos{max-width:1400px;margin:0 auto;display:flex;flex-direction:column;gap:18px}
    .panel{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px 18px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
    .filters-title{font-size:11px;font-weight:bold;color:var(--muted);letter-spacing:.06em;margin-bottom:10px}

    /* Carga */
    .uploads{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
    .up-card{border:1px solid var(--border);border-radius:9px;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
    .up-head{display:flex;align-items:center;gap:10px}
    .up-icon{width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;flex:none}
    .up-head b{display:block;font-size:13.5px}
    .up-sub{font-size:11.5px;color:var(--muted)}
    .file-label{display:inline-flex;align-items:center;justify-content:center;gap:6px;color:#fff;border-radius:7px;padding:9px 12px;font-size:12.5px;font-weight:bold;cursor:pointer}
    .file-label:hover{filter:brightness(.95)}
    .file-label input{display:none}
    .up-msg{font-size:11.5px}
    .up-msg.ok{color:var(--green)}
    .up-msg.err{color:var(--red)}

    /* Filtros */
    .filters-row{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end}
    .field{display:flex;flex-direction:column;gap:4px}
    .field label{font-size:11px;color:var(--muted);font-weight:bold}
    select{border:1px solid var(--border);border-radius:7px;padding:8px 10px;font-size:13px;font-family:inherit;background:#fff;color:var(--text);min-width:140px}
    select:focus{outline:2px solid var(--blue);outline-offset:1px}
    .btn{border:1px solid var(--border);background:#fff;border-radius:7px;padding:9px 14px;font-size:13px;font-weight:bold;cursor:pointer;color:var(--text)}
    .btn:hover{background:#f3f4f6}
    .btn.clear{color:var(--red);border-color:#fbd5db}
    .btn.clear:hover{background:#fef2f4}

    /* Cards */
    .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
    .kpi{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px;display:flex;gap:12px;align-items:center;box-shadow:0 1px 2px rgba(16,24,40,.04)}
    .kpi .icon{width:40px;height:40px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;flex:none}
    .kpi .label{font-size:10.5px;color:var(--muted);font-weight:bold;letter-spacing:.04em}
    .kpi .value{font-size:24px;font-weight:bold;margin-top:2px}
    .kpi .sub{font-size:11px;color:var(--muted);margin-top:2px}

    /* Breakdowns */
    .bk-block{padding-top:14px}
    .bk-title{font-size:12px;font-weight:bold;color:var(--navy);letter-spacing:.04em;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border)}
    .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px}
    .breakdown h3{margin:0 0 12px 0;font-size:12px;color:var(--muted);letter-spacing:.03em}
    .bar-row{display:grid;grid-template-columns:90px 1fr 52px;align-items:center;gap:8px;margin-bottom:8px;font-size:12.5px}
    .bar-lab{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .bar-track{background:#eef1f6;border-radius:5px;height:14px;overflow:hidden}
    .bar-fill{height:100%;border-radius:5px;background:var(--blue)}
    .bar-val{text-align:right;font-weight:bold}
    .bar-empty{font-size:12px;color:var(--muted)}

    /* Tabla */
    .table-panel{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden;box-shadow:0 1px 2px rgba(16,24,40,.04)}
    .table-head{padding:14px 18px;border-bottom:1px solid var(--border);font-size:13px;font-weight:bold;display:flex;justify-content:space-between;align-items:center}
    .table-head .count{color:var(--muted);font-weight:normal;font-size:12px}
    .table-scroll{overflow:auto;max-height:640px}
    table{border-collapse:collapse;width:100%;font-size:13px}
    thead th{position:sticky;top:0;background:#f8f9fc;z-index:2;text-align:center;padding:8px 10px;border-bottom:2px solid var(--border);color:var(--muted);font-size:11px;letter-spacing:.02em}
    thead th.left{text-align:left}
    thead th.grp{border-left:1px solid var(--border)}
    thead th.sortable{cursor:pointer;user-select:none;white-space:nowrap}
    thead th.sortable:hover{color:var(--blue)}
    thead th.grp-tm{background:#fff7ec;color:#b45309}
    thead th.grp-tt{background:#f5f0fe;color:#6d28d9}
    tbody td{padding:8px 10px;border-bottom:1px solid #f0f1f5;text-align:center}
    tbody td.left{text-align:left}
    tbody td.strong{font-weight:bold}
    tbody td.tm{background:#fffaf2}
    tbody td.tt{background:#faf7ff}
    .week-row{cursor:pointer}
    .week-row:hover{background:#eef4ff}
    .week-row.open{background:#eef4ff}
    .week-row .caret{color:var(--blue);font-size:11px;display:inline-block;width:12px}
    .total-pill{background:#eef4ff;color:var(--blue);border-radius:20px;padding:2px 12px;font-weight:bold;display:inline-block;min-width:34px}
    .detail-row td{background:#fbfcfe;color:#374151;font-size:12.5px}
    .detail-row td.tm{background:#fffdf8}
    .detail-row td.tt{background:#fdfbff}
    .detail-fecha{padding-left:26px;color:var(--muted)}
    .empty{padding:26px;color:var(--muted);font-style:italic}
    tfoot td{padding:10px;font-weight:bold;border-top:2px solid var(--border);background:#f8f9fc;text-align:center}
    tfoot td.left{text-align:left}
    tfoot td.tm{background:#fdf4e6}
    tfoot td.tt{background:#f3edfd}

    @media (max-width:1100px){
      .kpis,.uploads{grid-template-columns:1fr}
      .grid3{grid-template-columns:1fr}
    }
  `],
  imports: [CommonModule],
  providers: [{ provide: LOCALE_ID, useValue: 'es-AR' }],
})
export class DatosComponent implements OnInit {
  readonly svc = inject(DatosService);
  readonly auth = inject(AuthService);

  readonly CANALES = CANALES;
  readonly UPLOADS: { slug: CanalSlug; canal: Canal; label: string; icon: string; color: string }[] = [
    { slug: '0800', canal: '0800', label: '0800', icon: '☎️', color: '#2563eb' },
    { slug: 'leads', canal: 'Leads', label: 'Leads', icon: '📈', color: '#0f9d58' },
    { slug: 'chats', canal: 'Chats', label: 'Chats', icon: '💬', color: '#7c3aed' },
  ];

  // Filtros
  readonly fSemana = signal('');
  readonly fTurno = signal('');
  readonly fCanal = signal('');
  readonly fDia = signal('');
  readonly fMes = signal('');
  readonly fDiaMes = signal('');

  readonly expanded = signal<Set<string>>(new Set());
  readonly status = signal<Partial<Record<CanalSlug, { msg: string; ok: boolean }>>>({});

  // Orden de la tabla. Por defecto por semana descendente (más reciente arriba).
  readonly sortKey = signal<string>('semana');
  readonly sortDir = signal<'asc' | 'desc'>('desc');

  async ngOnInit() {
    try { await this.svc.fetchData(); } catch { /* el panel de carga informa el estado */ }
  }

  // ── Opciones de filtro (derivadas de todo el dataset) ────────────────
  readonly semanas = computed(() =>
    [...new Set(this.svc.allRows().map(r => r.semana))].filter(Boolean).sort((a, b) => this.semanaNum(a) - this.semanaNum(b) || a.localeCompare(b))
  );
  readonly turnos = computed(() => {
    const present = new Set(this.svc.allRows().map(r => r.turno).filter(Boolean));
    const ordered = ['Mañana', 'Tarde'].filter(t => present.has(t));
    const extra = [...present].filter(t => !ordered.includes(t)).sort();
    return [...ordered, ...extra];
  });
  readonly dias = computed(() => {
    const present = new Set(this.svc.allRows().map(r => r.dia));
    return DIA_ORDER.filter(d => present.has(d));
  });
  readonly meses = computed(() =>
    [...new Set(this.svc.allRows().map(r => this.mesDe(r.fecha)))].filter(m => m > 0).sort((a, b) => a - b)
  );
  readonly diasMes = computed(() =>
    [...new Set(this.svc.allRows().map(r => this.diaMesDe(r.fecha)))].filter(d => d > 0).sort((a, b) => a - b)
  );

  // ── Datos filtrados ──────────────────────────────────────────────────
  readonly filtered = computed<DatosRow[]>(() => {
    const s = this.fSemana(), t = this.fTurno(), c = this.fCanal(), d = this.fDia();
    const mes = this.fMes() ? parseInt(this.fMes(), 10) : 0;
    const dm = this.fDiaMes() ? parseInt(this.fDiaMes(), 10) : 0;
    return this.svc.allRows().filter(r => {
      if (s && r.semana !== s) return false;
      if (t && r.turno !== t) return false;
      if (c && r.canal !== c) return false;
      if (d && r.dia !== d) return false;
      if (mes && this.mesDe(r.fecha) !== mes) return false;
      if (dm && this.diaMesDe(r.fecha) !== dm) return false;
      return true;
    });
  });

  /** Canales visibles: si hay filtro de canal, sólo ese; si no, los 3.
   *  Controla qué cards, bloques de breakdown y columnas de la tabla se muestran. */
  readonly visibleCanales = computed<Canal[]>(() => {
    const c = this.fCanal() as Canal;
    return c ? [c] : CANALES;
  });
  isCanalVisible(c: Canal): boolean { return !this.fCanal() || this.fCanal() === c; }

  // ── Cards (sólo las de los canales visibles) ─────────────────────────
  readonly cards = computed(() => {
    const rows = this.filtered();
    const count = (canal: Canal) => rows.reduce((a, r) => a + (r.canal === canal ? 1 : 0), 0);
    const all = [
      { canal: '0800' as Canal, label: 'TOTAL 0800', value: count('0800'), icon: '☎️', color: '#2563eb' },
      { canal: 'Leads' as Canal, label: 'TOTAL LEADS', value: count('Leads'), icon: '📈', color: '#0f9d58' },
      { canal: 'Chats' as Canal, label: 'TOTAL CHATS', value: count('Chats'), icon: '💬', color: '#7c3aed' },
    ];
    return all.filter(c => this.isCanalVisible(c.canal));
  });

  // ── Breakdowns (un bloque por canal visible) ─────────────────────────
  readonly breakdowns = computed(() => {
    const rows = this.filtered();
    const turnoOrder = this.turnos();
    const diaOrder = this.dias();
    const semanaOrder = this.semanas();
    return this.visibleCanales().map(canal => {
      const cr = rows.filter(r => r.canal === canal);
      return {
        canal,
        turno: this.bars(cr, r => r.turno, turnoOrder),
        dia: this.bars(cr, r => r.dia, diaOrder),
        semana: this.bars(cr, r => r.semana, semanaOrder),
      };
    });
  });

  private bars(rows: DatosRow[], key: (r: DatosRow) => string, order: string[]): BarItem[] {
    const counts: Record<string, number> = {};
    order.forEach(k => counts[k] = 0);
    rows.forEach(r => { const k = key(r); if (k in counts) counts[k]++; });
    const max = Math.max(1, ...order.map(k => counts[k]));
    return order.map(k => ({ label: k, value: counts[k], pct: (counts[k] / max) * 100 }));
  }

  // ── Modelo de columnas de la tabla (dinámico según canales visibles) ──
  // Cada grupo (Totales / TM / TT) aporta una columna por canal visible + Total.
  private readonly GROUPS = [
    { name: 'TOTALES', cls: 'grp-tot', cp: 'c', totalKey: 'total', tdcls: '' },
    { name: 'TM · MAÑANA', cls: 'grp-tm', cp: 'tm', totalKey: 'tmTotal', tdcls: 'tm' },
    { name: 'TT · TARDE', cls: 'grp-tt', cp: 'tt', totalKey: 'ttTotal', tdcls: 'tt' },
  ];

  readonly headerGroups = computed(() =>
    this.GROUPS.map(g => ({ name: g.name, cls: g.cls, span: this.visibleCanales().length + 1 }))
  );

  readonly cols = computed(() => {
    const cans = this.visibleCanales();
    const out: { key: string; label: string; tdcls: string; strong: boolean; groupStart: boolean; pill: boolean }[] = [];
    for (const g of this.GROUPS) {
      cans.forEach((c, i) => out.push({ key: g.cp + c, label: c, tdcls: g.tdcls, strong: false, groupStart: i === 0, pill: false }));
      out.push({ key: g.totalKey, label: 'Total', tdcls: g.tdcls, strong: true, groupStart: false, pill: g.totalKey === 'total' });
    }
    return out;
  });

  readonly colCount = computed(() => 1 + this.cols().length);

  cellVal(cells: Cells, key: string): number { return (cells as unknown as Record<string, number>)[key]; }

  // ── Tabla por semana + drill-down por fecha ──────────────────────────
  readonly table = computed(() => {
    const rows = this.filtered();
    const byWeek = new Map<string, { cells: Cells; byFecha: Map<string, FechaRow> }>();
    for (const r of rows) {
      let w = byWeek.get(r.semana);
      if (!w) { w = { cells: emptyCells(), byFecha: new Map() }; byWeek.set(r.semana, w); }
      addTo(w.cells, r);
      let f = w.byFecha.get(r.fecha);
      if (!f) { f = { fecha: r.fecha, dia: r.dia, cells: emptyCells() }; w.byFecha.set(r.fecha, f); }
      addTo(f.cells, r);
    }
    const dir = this.sortDir() === 'desc' ? -1 : 1;
    const key = this.sortKey();
    const weeks: WeekRow[] = [...byWeek.entries()]
      .map(([semana, w]) => ({
        semana,
        cells: w.cells,
        // el detalle por fecha sigue la misma dirección que el orden de la tabla
        fechas: [...w.byFecha.values()].sort((a, b) => a.fecha.localeCompare(b.fecha) * dir),
      }))
      .sort((a, b) => {
        if (key === 'semana') {
          return (this.semanaNum(a.semana) - this.semanaNum(b.semana) || a.semana.localeCompare(b.semana)) * dir;
        }
        const av = (a.cells as unknown as Record<string, number>)[key];
        const bv = (b.cells as unknown as Record<string, number>)[key];
        return (av - bv) * dir || (this.semanaNum(a.semana) - this.semanaNum(b.semana));
      });
    const totals = emptyCells();
    weeks.forEach(w => sumInto(totals, w.cells));
    return { weeks, totals };
  });

  // ── Acciones ─────────────────────────────────────────────────────────
  sort(key: string) {
    if (this.sortKey() === key) {
      this.sortDir.update(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      this.sortKey.set(key);
      this.sortDir.set('desc'); // nueva columna: de mayor a menor (semana desc = más reciente)
    }
  }

  arrow(key: string): string {
    if (this.sortKey() !== key) return '';
    return this.sortDir() === 'desc' ? ' ▾' : ' ▴';
  }

  toggle(semana: string) {
    this.expanded.update(set => {
      const next = new Set(set);
      next.has(semana) ? next.delete(semana) : next.add(semana);
      return next;
    });
  }

  limpiar() {
    this.fSemana.set(''); this.fTurno.set(''); this.fCanal.set('');
    this.fDia.set(''); this.fMes.set(''); this.fDiaMes.set('');
  }

  onUpload(canal: CanalSlug, ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.setStatus(canal, '⏳ Procesando ' + file.name + '…', true);
    this.svc.upload(canal, file)
      .then(async r => {
        await this.svc.fetchData();
        this.setStatus(canal, `✓ ${file.name} — ${r.rows.toLocaleString('es-AR')} filas`, true);
      })
      .catch(e => {
        const msg = e?.error?.error || e?.message || 'No se pudo procesar el archivo.';
        this.setStatus(canal, '✗ ' + msg, false);
      });
  }

  private setStatus(canal: CanalSlug, msg: string, ok: boolean) {
    this.status.update(s => ({ ...s, [canal]: { msg, ok } }));
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  mesDe(f: string): number { const p = f.split('-'); return p.length > 1 ? parseInt(p[1], 10) : 0; }
  diaMesDe(f: string): number { const p = f.split('-'); return p.length > 2 ? parseInt(p[2], 10) : 0; }
  mesNombre(m: number): string { return MES_NOMBRE[m] ?? String(m); }
  semanaNum(s: string): number { const m = s.match(/\d+/); return m ? parseInt(m[0], 10) : 0; }
  formatFecha(f: string): string { const [y, m, d] = f.split('-'); return `${d}/${m}/${y}`; }
}

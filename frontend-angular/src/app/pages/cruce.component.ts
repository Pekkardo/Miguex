import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { CruceService } from '../services/cruce.service';
import { AuthService } from '../services/auth.service';
import { CruceRow, FacetKey } from '../models/cruce.model';

type SortKey = 'u' | 'vendedor' | 'lider' | 'campania' | 'cantidad';

interface FacetDef { key: FacetKey; label: string; }

@Component({
  selector: 'app-cruce',
  standalone: true,
  // Paleta azul de la página original (ver .theme-azul en styles.css).
  host: { class: 'theme-azul' },
  template: `
    <div class="dash">

      <!-- CARGA DE ARCHIVOS -->
      @if (auth.isAdmin()) {
        <div class="uploads">
          @for (dz of dropzones; track dz.tipo) {
            <div class="upload up-card" [class.done]="loaded(dz.tipo)"
                 (click)="pick(dz.tipo)"
                 (dragover)="$event.preventDefault()"
                 (drop)="onDrop($event)">
              <div class="u-icon">{{ dz.icon }}</div>
              <div class="u-body">
                <div class="u-title">{{ dz.title }}</div>
                <div class="u-sub">{{ dz.cols }}</div>
                <div class="u-status">{{ statusFor(dz.tipo) }}</div>
              </div>
            </div>
          }
        </div>
        <input #fileInput type="file" accept=".xlsx,.xls" hidden (change)="onPick($event)">
      }

      @if (notice()) { <div class="notice" [class.err]="noticeErr()">{{ notice() }}</div> }

      @if (!svc.ready()) {
        <div class="card empty-state">
          @if (auth.isAdmin()) {
            {{ missingMsg() }}
          } @else {
            Todavía no hay datos cargados. Pedile a un administrador que suba la Nómina y las Ventas.
          }
        </div>
      } @else {

        <!-- FILTROS -->
        <div class="fbar">
          <span class="fbar-title">Filtros</span>
          @for (fc of facets; track fc.key) {
            <div class="filter-group">
              <label>{{ fc.label }}</label>
              <div class="ms" [class.open]="openFacet() === fc.key">
                <button type="button" class="ms-btn" (click)="toggleOpen(fc.key)">
                  {{ btnLabel(fc.key) }}
                </button>
                <div class="ms-panel">
                  <label class="ms-opt ms-all">
                    <input type="checkbox" [checked]="!f()[fc.key].length"
                           (change)="svc.clearFacet(fc.key)"> Todos
                  </label>
                  @for (v of valuesFor(fc.key); track v) {
                    <label class="ms-opt">
                      <input type="checkbox" [checked]="f()[fc.key].includes(v)"
                             (change)="svc.toggleFacet(fc.key, v)">
                      {{ display(fc.key, v) }}
                    </label>
                  }
                </div>
              </div>
            </div>
          }
          <div class="filter-group grow">
            <label>Buscar</label>
            <input type="search" class="search-box" placeholder="Vendedor o líder…"
                   [value]="svc.search()" (input)="svc.search.set($any($event.target).value)">
          </div>
          <button class="reset-btn" (click)="svc.resetFilters()">Limpiar filtros</button>
          <button class="export-btn" (click)="exportCsv()">Exportar CSV</button>
          @if (auth.isAdmin()) {
            <button class="danger-btn" (click)="limpiarDatos()">Limpiar datos</button>
          }
        </div>

        <!-- KPIs -->
        <div class="metrics metrics-5">
          <div class="metric"><div class="mlabel">Vendedores en nómina</div>
            <div class="mval">{{ svc.kpi().total }}</div><div class="msub">en el filtro actual</div></div>
          <div class="metric g"><div class="mlabel">Con matrícula</div>
            <div class="mval">{{ svc.kpi().con }}</div><div class="msub">en el filtro actual</div></div>
          <div class="metric r"><div class="mlabel">En cero</div>
            <div class="mval">{{ svc.kpi().sin }}</div><div class="msub">en el filtro actual</div></div>
          <div class="metric a"><div class="mlabel">Conversión</div>
            <div class="mval">{{ svc.kpi().conversion }}</div><div class="msub">{{ svc.kpi().conversionSub }}</div></div>
          <div class="metric p"><div class="mlabel">Total matrículas</div>
            <div class="mval">{{ svc.kpi().matriculas }}</div><div class="msub">en el filtro actual</div></div>
        </div>

        <!-- DETALLE -->
        <div class="atcard">
          <div class="atcard-hdr">
            <div class="ctitle" style="margin:0">Detalle por vendedor <span>{{ sorted().length }} vendedores</span></div>
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
                @for (r of sorted(); track r.u) {
                  <tr (click)="toggleDetail(r.u)" [class.expanded]="expanded() === r.u">
                    <td>{{ r.u }}</td>
                    <td>{{ r.vendedor }}</td>
                    <td>{{ r.lider }}</td>
                    <td>{{ r.campania }}</td>
                    <td><span class="tag" [class.tag-si]="r.cantidad > 0"
                              [class.tag-no]="r.cantidad === 0">{{ r.cantidad }}</span></td>
                  </tr>
                  @if (expanded() === r.u) {
                    <tr class="detail-row">
                      <td colspan="5">
                        @if (carrerasDe(r); as cs) {
                          @if (cs.length) { <b>Carreras:</b> {{ cs.join(' · ') }} }
                          @else { Sin matrículas en el filtro actual. }
                        }
                      </td>
                    </tr>
                  }
                } @empty {
                  <tr><td colspan="5" class="empty">Sin vendedores para los filtros actuales.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        @if (svc.huerfanos().length) {
          <details class="qa">
            <summary>⚠ {{ svc.huerfanos().length }} código(s) de Ventas no encontrados en la Nómina (no se contabilizan)</summary>
            <div style="margin-top:8px">{{ svc.huerfanos().join(', ') }}</div>
          </details>
        }
      }

    </div>
  `,
  styles: [`
    .uploads{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    @media(max-width:800px){.uploads{grid-template-columns:1fr}}
    .up-card{display:flex;align-items:center;gap:13px;text-align:left;padding:14px 16px}
    .u-icon{font-size:26px;flex:none}
    .u-body{flex:1}
    .u-title{font-size:13px;font-weight:600}
    .u-sub{font-size:11px;color:var(--muted2);margin-top:1px}
    .u-status{font-size:11px;color:var(--muted);margin-top:4px}
    .upload.done .u-status{color:var(--green);font-weight:600}
    .notice{background:var(--amber-bg);color:var(--amber);border:1px solid var(--amber);
      border-radius:var(--r);padding:9px 13px;font-size:12px}
    .notice.err{background:#FDEAEA;color:#E03131;border-color:#F5C2C2}
    .empty-state{text-align:center;padding:60px 20px;color:var(--muted);font-size:13px;
      border-style:dashed}
    .metrics-5{grid-template-columns:repeat(5,1fr)}
    .metric .mval{color:var(--azul)}
    .metric.g .mval{color:var(--verde)}
    .metric.r .mval{color:var(--rojo)}
    .metric.a .mval{color:var(--ambar)}
    .metric.p .mval{color:var(--violeta)}
    .filter-group.grow{flex:1;min-width:160px}
    .search-box{border:1px solid var(--border2);border-radius:6px;padding:5px 9px;font-size:12px;
      background:var(--surface);color:var(--text);outline:none;width:100%}
    .search-box:focus{border-color:var(--celeste)}
    .export-btn,.danger-btn{font-size:12px;padding:5px 10px;border-radius:6px;
      border:1px solid var(--border2);background:var(--surface);color:var(--muted);cursor:pointer;transition:.12s}
    .export-btn:hover{border-color:var(--celeste);color:var(--celeste)}
    .danger-btn{border-color:#F5C2C2;color:var(--rojo)}
    .danger-btn:hover{background:var(--rojo);color:#fff;border-color:var(--rojo)}

    /* Multi-select con checkboxes */
    .ms{position:relative}
    .ms-btn{font-size:12px;border:1px solid var(--border2);border-radius:6px;padding:5px 9px;
      background:var(--bg);color:var(--text);cursor:pointer;min-width:110px;text-align:left;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ms-btn:hover{border-color:var(--celeste)}
    .ms-panel{display:none;position:absolute;top:calc(100% + 3px);left:0;z-index:150;
      background:var(--surface);border:1px solid var(--border2);border-radius:var(--r);
      box-shadow:0 4px 14px rgba(0,0,0,.1);min-width:190px;max-height:270px;overflow:auto;padding:4px}
    .ms.open .ms-panel{display:block}
    .ms-opt{display:flex;align-items:center;gap:7px;font-size:12px;padding:5px 8px;
      border-radius:5px;cursor:pointer;white-space:nowrap}
    .ms-opt:hover{background:var(--bg)}
    .ms-all{border-bottom:1px solid var(--border);margin-bottom:3px;padding-bottom:6px;font-weight:600}

    .table-scroll{max-height:560px;overflow:auto}
    thead th.sorted{color:var(--celeste)}
    /* Rayado, hover y fila expandida de la tabla original */
    tbody tr{cursor:pointer}
    tbody tr:nth-child(even):not(.detail-row) td{background:#FAFBFD}
    tbody tr:hover:not(.detail-row) td{background:#EAF3FD}
    tbody tr.expanded td{background:#E3F0FC}
    .detail-row{cursor:default}
    .detail-row td{background:#F6F8FC;font-size:12px;color:var(--muted);padding:9px 16px 12px 32px}
    .detail-row b{color:var(--text)}
    .tag{padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700;display:inline-block}
    .tag-si{background:#E3FAF1;color:var(--verde)}
    .tag-no{background:#FDEAEA;color:var(--rojo)}
    .qa{font-size:12px;color:#8A2020;background:#FDEAEA;border:1px solid #F5C2C2;
      border-radius:var(--r);padding:10px 14px}
    .qa summary{cursor:pointer;font-weight:700}
  `]
})
export class CruceComponent {
  readonly svc = inject(CruceService);
  readonly auth = inject(AuthService);

  readonly facets: FacetDef[] = [
    { key: 'mes', label: 'Mes' },
    { key: 'semana', label: 'Semana' },
    { key: 'dia', label: 'Día' },
    { key: 'lider', label: 'Líder' },
    { key: 'campania', label: 'Campaña' },
    { key: 'estado', label: 'Estado' }
  ];

  readonly columns: { key: SortKey; label: string }[] = [
    { key: 'u', label: 'U' },
    { key: 'vendedor', label: 'Vendedor' },
    { key: 'lider', label: 'Líder' },
    { key: 'campania', label: 'Campaña' },
    { key: 'cantidad', label: 'Matrículas' }
  ];

  readonly dropzones = [
    { tipo: 'nomina' as const, icon: '📋', title: 'Nómina de vendedores', cols: 'Columnas: U, Vendedor, Lider, Campaña' },
    { tipo: 'ventas' as const, icon: '💳', title: 'Ventas / Matrículas', cols: 'Columnas: Neotel, Dia, Mes, Semana, Nombre de carrera' }
  ];

  sortKey = signal<SortKey>('cantidad');
  sortDir = signal<'asc' | 'desc'>('desc');
  expanded = signal<string | null>(null);
  openFacet = signal<FacetKey | null>(null);
  notice = signal('');
  noticeErr = signal(false);

  f = computed(() => this.svc.filters());

  /** Valores de cada filtro, recalculados sólo cuando cambian datos o selección. */
  private facetOptions = computed<Record<FacetKey, string[]>>(() => {
    this.svc.nomina(); this.svc.ventas(); this.svc.filters(); // dependencias explícitas
    return {
      mes: this.svc.facetValues('mes'),
      semana: this.svc.facetValues('semana'),
      dia: this.svc.facetValues('dia'),
      lider: this.svc.facetValues('lider'),
      campania: this.svc.facetValues('campania'),
      estado: this.svc.facetValues('estado')
    };
  });

  constructor() {
    this.svc.fetchData().catch(() => {
      // El interceptor maneja el 401; otros errores se muestran como aviso.
      this.setNotice('No se pudieron leer los datos guardados.', true);
    });
  }

  /**
   * Un clic fuera cierra el desplegable abierto. Se comprueba el origen del clic en vez
   * de confiar en stopPropagation(): Angular registra los listeners globales en fase de
   * captura, así que corren antes que el handler del botón y no se pueden frenar desde él.
   */
  @HostListener('document:click', ['$event'])
  closePanels(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.ms')) this.openFacet.set(null);
  }

  toggleOpen(key: FacetKey) {
    this.openFacet.set(this.openFacet() === key ? null : key);
  }

  valuesFor(key: FacetKey) { return this.facetOptions()[key]; }

  display(key: FacetKey, v: string) {
    if (key === 'mes') return v.charAt(0).toUpperCase() + v.slice(1);
    if (key === 'semana') return v.replace(/^Semana\s*/i, 'Sem. ');
    return v;
  }

  btnLabel(key: FacetKey) {
    const sel = this.f()[key];
    if (!sel.length) return 'Todos';
    if (sel.length === 1) return this.display(key, sel[0]);
    return `${sel.length} seleccionados`;
  }

  loaded(tipo: 'nomina' | 'ventas') {
    return (tipo === 'nomina' ? this.svc.nomina() : this.svc.ventas()).length > 0;
  }

  statusFor(tipo: 'nomina' | 'ventas') {
    const rows = tipo === 'nomina' ? this.svc.nomina() : this.svc.ventas();
    if (!rows.length) return 'Sin cargar — hacé clic para elegir archivo';
    const name = this.svc.fileNames()[tipo];
    return `Cargado — ${rows.length} filas ${name ? `(${name})` : '(en BBDD)'}`;
  }

  missingMsg() {
    const n = this.svc.nomina().length, v = this.svc.ventas().length;
    if (!n && !v) return 'Cargá los dos archivos arriba para ver el cruce.';
    return !n ? 'Falta subir la Nómina de vendedores.' : 'Falta subir las Ventas / Matrículas.';
  }

  sorted = computed<CruceRow[]>(() => {
    const key = this.sortKey();
    const dir = this.sortDir();
    return [...this.svc.rows()].sort((a, b) => {
      let av: any = a[key], bv: any = b[key];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  });

  sortBy(key: SortKey) {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set(key === 'cantidad' ? 'desc' : 'asc');
    }
  }

  toggleDetail(u: string) {
    this.expanded.set(this.expanded() === u ? null : u);
  }

  carrerasDe(r: CruceRow) {
    return Object.entries(r.carreras).map(([k, n]) => `${k} (${n})`);
  }

  // ── Upload ──────────────────────────────────────────────────────
  private pending: 'nomina' | 'ventas' | null = null;

  pick(tipo: 'nomina' | 'ventas') {
    this.pending = tipo;
    (document.querySelector('input[type=file]') as HTMLInputElement)?.click();
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) this.send(file);
  }

  onPick(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.send(file);
  }

  /** El backend detecta solo si es Nómina o Ventas según las columnas del Excel. */
  private async send(file: File) {
    this.setNotice(`Subiendo y guardando "${file.name}"…`, false);
    try {
      const r = await this.svc.upload(file);
      this.setNotice(`✓ ${file.name} — ${r.filas} filas guardadas como ${r.tipo}.`, false);
    } catch (e: any) {
      this.setNotice(e?.error?.error ?? `No se pudo guardar "${file.name}".`, true);
    } finally {
      this.pending = null;
    }
  }

  private setNotice(msg: string, err: boolean) {
    this.notice.set(msg);
    this.noticeErr.set(err);
  }

  async limpiarDatos() {
    if (!confirm('Esto borra la Nómina y las Ventas guardadas. ¿Continuar?')) return;
    try {
      await this.svc.limpiar();
      this.setNotice('Datos del cruce eliminados.', false);
    } catch (e: any) {
      this.setNotice(e?.error?.error ?? 'No se pudieron borrar los datos.', true);
    }
  }

  /**
   * Export en CSV nativo: evita sumar la dependencia xlsx (pesada y con CVEs conocidas)
   * sólo para volcar una tabla plana. Excel abre el CSV sin problema.
   */
  exportCsv() {
    const head = ['U', 'Vendedor', 'Lider', 'Campania', 'Estado', 'Matriculas'];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      head.join(','),
      ...[...this.svc.rows()]
        .sort((a, b) => b.cantidad - a.cantidad)
        .map(r => [r.u, r.vendedor, r.lider, r.campania, r.estado, r.cantidad].map(esc).join(','))
    ];
    // BOM para que Excel respete los acentos.
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cruce_matriculas.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}

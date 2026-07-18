import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  CruceData, CruceFilters, CruceRow, CruceUploadResult, FacetKey,
  MES_ORDER, NominaRow, VentaRow, emptyCruceFilters
} from '../models/cruce.model';

/** De qué tabla sale cada filtro y cómo se lee el valor de una fila. */
const FACETS: Record<FacetKey, {
  source: 'ventas' | 'nomina';
  get: (r: any) => string;
  kind: 'mes' | 'semana' | 'dia' | 'texto';
}> = {
  mes:      { source: 'ventas', get: r => r.mes,      kind: 'mes' },
  semana:   { source: 'ventas', get: r => r.semana,   kind: 'semana' },
  dia:      { source: 'ventas', get: r => r.dia,      kind: 'dia' },
  lider:    { source: 'nomina', get: r => r.lider,    kind: 'texto' },
  campania: { source: 'nomina', get: r => r.campania, kind: 'texto' },
  estado:   { source: 'nomina', get: r => r.estado,   kind: 'texto' }
};

const GROUPS: Record<'ventas' | 'nomina', FacetKey[]> = {
  ventas: ['mes', 'semana', 'dia'],
  nomina: ['lider', 'campania', 'estado']
};

@Injectable({ providedIn: 'root' })
export class CruceService {
  private http = inject(HttpClient);
  private readonly api = '/api/cruce';

  readonly nomina = signal<NominaRow[]>([]);
  readonly ventas = signal<VentaRow[]>([]);
  readonly filters = signal<CruceFilters>(emptyCruceFilters());
  readonly search = signal('');
  readonly fileNames = signal<{ nomina: string; ventas: string }>({ nomina: '', ventas: '' });

  readonly ready = computed(() => this.nomina().length > 0 && this.ventas().length > 0);

  /** Ventas que pasan los filtros de tiempo (mes/semana/día). */
  private filteredVentas = computed(() => {
    const f = this.filters();
    return this.ventas().filter(v =>
      (!f.mes.length || f.mes.includes(v.mes)) &&
      (!f.semana.length || f.semana.includes(v.semana)) &&
      (!f.dia.length || f.dia.includes(v.dia))
    );
  });

  /** El cruce: cada vendedor de la nómina con su conteo de matrículas y detalle por carrera. */
  readonly rows = computed<CruceRow[]>(() => {
    const countMap: Record<string, number> = {};
    const carreraMap: Record<string, Record<string, number>> = {};
    this.filteredVentas().forEach(v => {
      countMap[v.neotel] = (countMap[v.neotel] || 0) + 1;
      (carreraMap[v.neotel] ??= {});
      const c = v.carrera || '(sin carrera)';
      carreraMap[v.neotel][c] = (carreraMap[v.neotel][c] || 0) + 1;
    });

    const f = this.filters();
    const s = this.search().toLowerCase().trim();

    return this.nomina()
      .map(n => ({
        u: n.u, vendedor: n.vendedor, lider: n.lider, campania: n.campania, estado: n.estado,
        cantidad: countMap[n.u] || 0,
        carreras: carreraMap[n.u] || {}
      }))
      .filter(r =>
        (!f.lider.length || f.lider.includes(r.lider)) &&
        (!f.campania.length || f.campania.includes(r.campania)) &&
        (!f.estado.length || f.estado.includes(r.estado)) &&
        (!s || r.vendedor.toLowerCase().includes(s) || r.lider.toLowerCase().includes(s))
      );
  });

  readonly kpi = computed(() => {
    const rows = this.rows();
    const total = rows.length;
    const con = rows.filter(r => r.cantidad > 0).length;
    return {
      total,
      con,
      sin: total - con,
      matriculas: rows.reduce((s, r) => s + r.cantidad, 0),
      conversion: total ? (con / total * 100).toFixed(1) + '%' : '—',
      conversionSub: `${con} de ${total} vendedores`
    };
  });

  /** Códigos de Ventas que no figuran en la Nómina: no se contabilizan en el cruce. */
  readonly huerfanos = computed(() => {
    if (!this.ready()) return [];
    const enNomina = new Set(this.nomina().map(n => n.u));
    return [...new Set(this.ventas().map(v => v.neotel))].filter(u => !enNomina.has(u));
  });

  /**
   * Valores disponibles para un filtro, acotados por los OTROS filtros de su mismo grupo.
   * Se ignora la selección propia para poder seguir sumando y quitando valores.
   */
  facetValues(key: FacetKey): string[] {
    const cfg = FACETS[key];
    const rows: any[] = cfg.source === 'ventas' ? this.ventas() : this.nomina();
    const f = this.filters();
    const siblings = GROUPS[cfg.source].filter(k => k !== key && f[k].length);

    const set = new Set<string>();
    rows.forEach(row => {
      for (const k of siblings) {
        if (!f[k].includes(FACETS[k].get(row))) return;
      }
      const v = cfg.get(row);
      if (v) set.add(v);
    });
    return this.sortValues([...set], cfg.kind);
  }

  private sortValues(arr: string[], kind: string): string[] {
    const vals = arr.filter(v => v !== '');
    if (kind === 'mes') {
      return vals.sort((a, b) => {
        const ia = MES_ORDER.indexOf(a.toLowerCase());
        const ib = MES_ORDER.indexOf(b.toLowerCase());
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
    }
    if (kind === 'semana') {
      // De la semana más reciente (número mayor) a la más antigua.
      const num = (s: string) => parseInt((s.match(/\d+/) || ['0'])[0], 10);
      return vals.sort((a, b) => num(b) - num(a));
    }
    if (kind === 'dia') return vals.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    return vals.sort((a, b) => a.localeCompare(b));
  }

  toggleFacet(key: FacetKey, value: string) {
    this.filters.update(f => {
      const cur = f[key];
      return { ...f, [key]: cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value] };
    });
  }

  /** Vacía un filtro: sin selección equivale a "Todos". */
  clearFacet(key: FacetKey) {
    this.filters.update(f => ({ ...f, [key]: [] }));
  }

  resetFilters() {
    this.filters.set(emptyCruceFilters());
    this.search.set('');
  }

  async fetchData(): Promise<void> {
    const data = await firstValueFrom(this.http.get<CruceData>(`${this.api}/data`));
    this.nomina.set(data?.nomina ?? []);
    this.ventas.set(data?.ventas ?? []);
  }

  async upload(file: File): Promise<CruceUploadResult> {
    const fd = new FormData();
    fd.append('file', file);
    const r = await firstValueFrom(this.http.post<CruceUploadResult>(`${this.api}/upload`, fd));
    if (r?.tipo) {
      this.fileNames.update(n => ({ ...n, [r.tipo]: file.name }));
    }
    await this.fetchData();
    return r;
  }

  /** Vacía las dos tablas del cruce (sólo ADMIN: el backend lo exige). */
  async limpiar(): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.api}/data`));
    this.fileNames.set({ nomina: '', ventas: '' });
    this.resetFilters();
    await this.fetchData();
  }
}

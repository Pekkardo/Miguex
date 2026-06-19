import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CallRow, Filters, UploadResult, emptyFilters } from '../models/call.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private readonly api = '/api';

  // ── Estado ──────────────────────────────────────────────────────
  readonly allRows = signal<CallRow[]>([]);
  readonly fileName = signal<string>('');
  readonly filters = signal<Filters>(emptyFilters());

  // ── Derivados ───────────────────────────────────────────────────
  readonly connectedAll = computed(() => this.allRows().filter(r => r.conn));

  readonly agents = computed(() =>
    [...new Set(this.connectedAll().map(r => r.agent))].sort()
  );

  readonly filtered = computed<CallRow[]>(() => {
    const f = this.filters();
    return this.allRows().filter(r => {
      if (f.desde && r.dateKey && r.dateKey < f.desde) return false;
      if (f.hasta && r.dateKey && r.dateKey > f.hasta) return false;
      if (f.hora !== '' && r.h !== +f.hora) return false;
      if (f.agente && r.agent !== f.agente) return false;
      if (f.dia !== '' && r.dow !== +f.dia) return false;
      if (f.mat === '1' && !r.mat) return false;
      if (f.mat === '0' && r.mat) return false;
      return true;
    });
  });

  readonly filteredConnected = computed(() => this.filtered().filter(r => r.conn));
  readonly filteredLost = computed(() => this.filtered().filter(r => !r.conn));

  // ── Acciones de filtro ──────────────────────────────────────────
  patchFilters(p: Partial<Filters>) {
    this.filters.update(f => ({ ...f, ...p }));
  }

  resetFilters() {
    const dates = this.connectedAll().map(r => r.dateKey).filter(Boolean).sort();
    this.filters.set({
      ...emptyFilters(),
      desde: dates[0] ?? '',
      hasta: dates[dates.length - 1] ?? ''
    });
  }

  toggleAgent(name: string) {
    this.patchFilters({ agente: this.filters().agente === name ? '' : name });
  }

  // ── API ─────────────────────────────────────────────────────────
  async fetchData(): Promise<number> {
    const rows = await firstValueFrom(this.http.get<CallRow[]>(`${this.api}/data`));
    this.allRows.set(rows ?? []);
    const dates = this.connectedAll().map(r => r.dateKey).filter(Boolean).sort();
    if (dates.length) {
      this.patchFilters({ desde: dates[0], hasta: dates[dates.length - 1] });
    }
    return rows?.length ?? 0;
  }

  upload(file: File): Promise<UploadResult> {
    const fd = new FormData();
    fd.append('file', file);
    return firstValueFrom(this.http.post<UploadResult>(`${this.api}/upload`, fd));
  }
}

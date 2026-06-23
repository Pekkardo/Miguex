import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { WadFilters, WadRow, WadUploadResult, emptyWadFilters } from '../models/wad.model';

@Injectable({ providedIn: 'root' })
export class WadService {
  private http = inject(HttpClient);
  private readonly api = '/api/wad';

  readonly allRows = signal<WadRow[]>([]);
  readonly fileName = signal<string>('');
  readonly filters = signal<WadFilters>(emptyWadFilters());

  readonly agents = computed(() =>
    [...new Set(this.allRows().map(r => r.ag))].filter(Boolean).sort()
  );

  readonly horas = computed(() =>
    [...new Set(this.allRows().map(r => r.h))].filter(h => !isNaN(h)).sort((a, b) => a - b)
  );

  readonly filtered = computed<WadRow[]>(() => {
    const f = this.filters();
    return this.allRows().filter(r => {
      if (f.desde && r.dk < f.desde) return false;
      if (f.hasta && r.dk > f.hasta) return false;
      if (f.hora !== '' && r.h !== +f.hora) return false;
      if (f.ag && r.ag !== f.ag) return false;
      if (f.estado && r.ec !== f.estado) return false;
      if (f.dia && r.dia !== f.dia) return false;
      if (f.mat === '1' && r.mat !== 1) return false;
      if (f.mat === '0' && r.mat !== 0) return false;
      if (f.rep === '1' && r.rep !== 1) return false;
      if (f.rep === '0' && r.rep !== 0) return false;
      return true;
    });
  });

  patchFilters(p: Partial<WadFilters>) {
    this.filters.update(f => ({ ...f, ...p }));
  }

  resetFilters() {
    const dates = this.allRows().map(r => r.dk).filter(Boolean).sort();
    this.filters.set({
      ...emptyWadFilters(),
      desde: dates[0] ?? '',
      hasta: dates[dates.length - 1] ?? ''
    });
  }

  toggleAgent(name: string) {
    this.patchFilters({ ag: this.filters().ag === name ? '' : name });
  }

  filterByDate(dk: string) {
    const f = this.filters();
    if (f.desde === dk && f.hasta === dk) {
      this.resetFilters();
    } else {
      this.patchFilters({ desde: dk, hasta: dk });
    }
  }

  async fetchData(): Promise<number> {
    const rows = await firstValueFrom(this.http.get<WadRow[]>(`${this.api}/data`));
    this.allRows.set(rows ?? []);
    const dates = this.allRows().map(r => r.dk).filter(Boolean).sort();
    if (dates.length) {
      this.patchFilters({ desde: dates[0], hasta: dates[dates.length - 1] });
    }
    return rows?.length ?? 0;
  }

  upload(file: File): Promise<WadUploadResult> {
    const fd = new FormData();
    fd.append('file', file);
    return firstValueFrom(this.http.post<WadUploadResult>(`${this.api}/upload`, fd));
  }
}

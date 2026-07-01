import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EjecutivoFilters, EjecutivoRow, EjecutivoUploadResult, emptyEjecutivoFilters } from '../models/ejecutivo.model';

@Injectable({ providedIn: 'root' })
export class EjecutivoService {
  private http = inject(HttpClient);
  private readonly api = '/api/ejecutivo';

  readonly allRows = signal<EjecutivoRow[]>([]);
  readonly fileName = signal<string>('');
  readonly filters = signal<EjecutivoFilters>(emptyEjecutivoFilters());

  readonly meses = computed(() =>
    [...new Set(this.allRows().map(r => r.mes))].filter(m => !isNaN(m)).sort((a, b) => a - b)
  );

  readonly dias = computed(() =>
    [...new Set(this.allRows().map(r => r.dia))].filter(d => !isNaN(d)).sort((a, b) => a - b)
  );

  readonly resoluciones = computed(() =>
    [...new Set(this.allRows().map(r => r.res))].filter(Boolean).sort()
  );

  readonly filtered = computed<EjecutivoRow[]>(() => {
    const f = this.filters();
    return this.allRows().filter(r => {
      if (f.mes && String(r.mes) !== f.mes) return false;
      if (f.dia && String(r.dia) !== f.dia) return false;
      if (f.res && r.res !== f.res) return false;
      if (f.sal && r.sal !== f.sal) return false;
      if (f.rep && r.rep !== f.rep) return false;
      if (f.search) {
        const s = f.search.toLowerCase();
        const hay = `${r.tel} ${r.usr} ${r.res} ${r.est}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  });

  patchFilters(p: Partial<EjecutivoFilters>) {
    this.filters.update(f => ({ ...f, ...p }));
  }

  resetFilters() {
    this.filters.set(emptyEjecutivoFilters());
  }

  async fetchData(): Promise<number> {
    const rows = await firstValueFrom(this.http.get<EjecutivoRow[]>(`${this.api}/data`));
    this.allRows.set(rows ?? []);
    return rows?.length ?? 0;
  }

  upload(file: File): Promise<EjecutivoUploadResult> {
    const fd = new FormData();
    fd.append('file', file);
    return firstValueFrom(this.http.post<EjecutivoUploadResult>(`${this.api}/upload`, fd));
  }
}

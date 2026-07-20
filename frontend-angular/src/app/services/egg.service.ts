import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EggFilters, EggRow, EggUploadResult, emptyEggFilters } from '../models/egg.model';

@Injectable({ providedIn: 'root' })
export class EggService {
  private http = inject(HttpClient);
  private readonly api = '/api/egg';

  readonly allRows = signal<EggRow[]>([]);
  readonly fileName = signal<string>('');
  readonly filters = signal<EggFilters>(emptyEggFilters());

  readonly meses = computed(() =>
    [...new Set(this.allRows().map(r => r.Mes))]
      .filter((m): m is number => m != null)
      .sort((a, b) => a - b)
  );

  readonly dias = computed(() =>
    [...new Set(this.allRows().map(r => r.Dia))]
      .filter((d): d is number => d != null)
      .sort((a, b) => a - b)
  );

  readonly resoluciones = computed(() =>
    [...new Set(this.allRows().map(r => r['Resolucion V2']))].filter(Boolean).sort()
  );

  readonly filtered = computed<EggRow[]>(() => {
    const f = this.filters();
    const search = f.search.toLowerCase().trim();
    return this.allRows().filter(r => {
      if (f.mes && String(r.Mes) !== f.mes) return false;
      if (f.dia && String(r.Dia) !== f.dia) return false;
      if (f.res && r['Resolucion V2'] !== f.res) return false;
      if (f.saliente && r.salientes !== f.saliente) return false;
      if (f.rep && r.Repetidos !== f.rep) return false;
      if (search) {
        const hay = `${r.Telefono} ${r.Usuario} ${r['Resolucion V2']} ${r.Estado}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  });

  patchFilters(p: Partial<EggFilters>) {
    this.filters.update(f => ({ ...f, ...p }));
  }

  resetFilters() {
    this.filters.set(emptyEggFilters());
  }

  async fetchData(): Promise<number> {
    const rows = await firstValueFrom(this.http.get<EggRow[]>(`${this.api}/data`));
    this.allRows.set(rows ?? []);
    return rows?.length ?? 0;
  }

  upload(file: File): Promise<EggUploadResult> {
    const fd = new FormData();
    fd.append('file', file);
    return firstValueFrom(this.http.post<EggUploadResult>(`${this.api}/upload`, fd));
  }
}

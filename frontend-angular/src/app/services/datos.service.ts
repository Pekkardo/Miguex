import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Canal, CanalSlug, DatosBundle, DatosRow, UploadResult } from '../models/datos.model';

/**
 * Datos del tablero "Datos". Los 3 Excel se parsean y persisten en el backend
 * (3 tablas MySQL); acá sólo se sube el archivo y se traen las filas ya normalizadas,
 * que se aplanan a un único arreglo etiquetado por canal para que el componente rinda.
 */
@Injectable({ providedIn: 'root' })
export class DatosService {
  private http = inject(HttpClient);
  private readonly api = '/api/datos';

  readonly allRows = signal<DatosRow[]>([]);

  readonly countByCanal = computed(() => {
    const c: Record<Canal, number> = { '0800': 0, Leads: 0, Chats: 0 };
    for (const r of this.allRows()) c[r.canal]++;
    return c;
  });

  async fetchData(): Promise<void> {
    const b = await firstValueFrom(this.http.get<DatosBundle>(`${this.api}/data`));
    const rows: DatosRow[] = [
      ...(b?.c0800 ?? []).map(x => ({ ...x, canal: '0800' as Canal })),
      ...(b?.leads ?? []).map(x => ({ ...x, canal: 'Leads' as Canal })),
      ...(b?.chats ?? []).map(x => ({ ...x, canal: 'Chats' as Canal })),
    ];
    this.allRows.set(rows);
  }

  upload(canal: CanalSlug, file: File): Promise<UploadResult> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('canal', canal);
    return firstValueFrom(this.http.post<UploadResult>(`${this.api}/upload`, fd));
  }
}

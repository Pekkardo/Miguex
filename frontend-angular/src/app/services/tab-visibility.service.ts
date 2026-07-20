import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TabVisibility } from '../models/tab-visibility.model';

@Injectable({ providedIn: 'root' })
export class TabVisibilityService {
  private http = inject(HttpClient);
  private readonly api = '/api/tabs/visibility';

  readonly visibility = signal<TabVisibility[]>([]);
  private loaded = false;

  async fetch(force = false): Promise<TabVisibility[]> {
    if (this.loaded && !force) return this.visibility();
    const rows = await firstValueFrom(this.http.get<TabVisibility[]>(this.api));
    this.visibility.set(rows ?? []);
    this.loaded = true;
    return this.visibility();
  }

  async update(rows: TabVisibility[]): Promise<void> {
    const res = await firstValueFrom(this.http.put<TabVisibility[]>(this.api, { tabs: rows }));
    this.visibility.set(res ?? rows);
  }

  /** Fail-open: si todavía no cargó, se considera visible. El gate real de acceso
   *  lo hace tabGuard, que siempre espera fetch() antes de decidir. */
  isVisible(tabId: string): boolean {
    const row = this.visibility().find(r => r.tabKey === tabId);
    return row ? row.visibleForViewer : true;
  }
}

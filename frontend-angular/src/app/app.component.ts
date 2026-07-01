import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

function routeKey(url: string): string {
  if (url.includes('ejecutivo')) return 'ejecutivo';
  if (url.includes('wad')) return 'wad';
  return '';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="topbar" [class.wad]="isWad()">
      <div class="topbar-l">
        <div class="logo">
          @if (isWad()) { <span>💬</span> }
          <svg viewBox="0 0 24 24"><path d="M3 5h18v2H3zm0 6h18v2H3zm0 6h18v2H3z"/></svg>
        </div>
        <h1>{{ title() }}</h1>
      </div>
      <div class="topbar-r">
        <span class="report-label">Reporte</span>
        <select class="report-select" [value]="current()" (change)="go($any($event.target).value)">
          <option value="">Tablero 0800 — Admisiones</option>
          <option value="wad">Tablero WhatsApp — Admisiones</option>
        </select>
      </div>
    </div>

    <router-outlet />
  `
})
export class AppComponent {
  private router = inject(Router);
  current = signal<string>(routeKey(this.router.url));

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.current.set(routeKey(this.router.url)));
  }

  isWad = computed(() => this.current() === 'wad');
  // Nota: "ejecutivo" es una ruta sin entrada en el selector (no listada en el nav),
  // solo accesible tipeando la URL directamente.
  title = computed(() => {
    if (this.current() === 'ejecutivo') return 'Tablero Ejecutivo — Admisiones';
    if (this.isWad()) return 'Tablero WhatsApp — Admisiones';
    return 'Tablero 0800 — Admisiones';
  });

  go(v: string) {
    this.router.navigateByUrl(v === 'wad' ? '/wad' : '/');
  }
}

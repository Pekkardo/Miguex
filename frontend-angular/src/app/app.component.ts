import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

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
  current = signal<string>(this.router.url.includes('wad') ? 'wad' : '');

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.current.set(this.router.url.includes('wad') ? 'wad' : ''));
  }

  isWad = computed(() => this.current() === 'wad');
  title = computed(() => this.isWad() ? 'Tablero WhatsApp — Admisiones' : 'Tablero 0800 — Admisiones');

  go(v: string) {
    this.router.navigateByUrl(v === 'wad' ? '/wad' : '/');
  }
}

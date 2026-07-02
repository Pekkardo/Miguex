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
        <a class="egg-link" href="/whatsapp-chats.html"
           title="Tablero Gestión de Chats WhatsApp (Egg)">
          💬 Chats WhatsApp (Egg)
        </a>
      </div>
    </div>

    <router-outlet />
  `,
  styles: [`
    .egg-link{
      display:inline-flex;align-items:center;gap:5px;
      font-size:13px;font-weight:600;text-decoration:none;
      color:#5a4600;background:#FFD43B;
      border:1px solid #F2B705;border-radius:8px;
      padding:6px 12px;margin-left:10px;
      transition:background .15s,box-shadow .15s;white-space:nowrap;
    }
    .egg-link:hover{background:#FFC400;box-shadow:0 1px 4px rgba(242,183,5,.4)}
  `]
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

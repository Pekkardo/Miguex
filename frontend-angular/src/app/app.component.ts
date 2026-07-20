import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { PAGES, pageForUrl } from './pages';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    @if (showBar()) {
      <div class="topbar" [attr.data-theme]="page().theme">
        <div class="topbar-l">
          <div class="logo">
            @if (page().icon) { <span>{{ page().icon }}</span> }
            <svg viewBox="0 0 24 24"><path d="M3 5h18v2H3zm0 6h18v2H3zm0 6h18v2H3z"/></svg>
          </div>
          <h1>{{ page().label }}</h1>
        </div>
        <div class="topbar-r">
          <span class="report-label">Reporte</span>
          <select class="report-select" [value]="page().path"
                  (change)="go($any($event.target).value)">
            @for (p of pages; track p.path) {
              <option [value]="p.path">{{ p.label }}</option>
            }
          </select>
          @if (auth.user(); as u) {
            <span class="user-chip" [title]="u.role === 'ADMIN' ? 'Administrador' : 'Sólo lectura'">
              {{ u.username }}
            </span>
            <button class="logout-btn" type="button" (click)="logout()">Salir</button>
          }
        </div>
      </div>
    }

    <router-outlet />
  `,
  styles: [`
    .user-chip{font-size:12px;font-weight:500;color:var(--muted);padding-left:4px}
    .logout-btn{font-size:12px;padding:5px 10px;border-radius:6px;border:1px solid var(--border2);
      background:var(--surface);color:var(--muted);cursor:pointer;transition:.12s}
    .logout-btn:hover{border-color:var(--coral);color:var(--coral)}
    /* Sobre las barras oscuras (cualquier tema) el chip y el botón van en blanco. */
    .topbar[data-theme] .user-chip{color:rgba(255,255,255,.85)}
    .topbar[data-theme] .logout-btn{background:transparent;color:#fff;
      border-color:rgba(255,255,255,.35)}
    .topbar[data-theme] .logout-btn:hover{border-color:#fff;color:#fff}
  `]
})
export class AppComponent {
  private router = inject(Router);
  readonly auth = inject(AuthService);
  readonly pages = PAGES;

  private url = signal(this.router.url);

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => this.url.set((e as NavigationEnd).urlAfterRedirects));
  }

  page = computed(() => pageForUrl(this.url()));

  /** El login se muestra a pantalla completa, sin la barra de navegación. */
  showBar = computed(() => !this.url().startsWith('/login'));

  go(path: string) {
    this.router.navigateByUrl('/' + path);
  }

  async logout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}

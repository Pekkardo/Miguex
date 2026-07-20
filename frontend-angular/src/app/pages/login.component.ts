import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-wrap">
      <form class="login-card" (ngSubmit)="submit()">
        <div class="login-logo">
          <svg viewBox="0 0 24 24"><path d="M3 5h18v2H3zm0 6h18v2H3zm0 6h18v2H3z"/></svg>
        </div>
        <h1>Tableros — Admisiones</h1>
        <p class="sub">Ingresá con tu usuario para continuar</p>

        <label for="u">Usuario</label>
        <input id="u" name="username" type="text" autocomplete="username"
               [(ngModel)]="username" [disabled]="loading()" required autofocus>

        <label for="p">Contraseña</label>
        <input id="p" name="password" type="password" autocomplete="current-password"
               [(ngModel)]="password" [disabled]="loading()" required>

        @if (error()) { <p class="err">{{ error() }}</p> }

        <button type="submit" [disabled]="loading() || !username || !password">
          {{ loading() ? 'Ingresando…' : 'Ingresar' }}
        </button>
      </form>
    </div>
  `,
  styles: [`
    .login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--bg)}
    .login-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);
      padding:28px 26px;width:100%;max-width:340px;display:flex;flex-direction:column}
    .login-logo{width:34px;height:34px;background:var(--text);border-radius:8px;display:flex;
      align-items:center;justify-content:center;margin-bottom:14px}
    .login-logo svg{width:17px;height:17px;fill:#fff}
    h1{font-size:16px;font-weight:600;letter-spacing:-.02em}
    .sub{font-size:12px;color:var(--muted);margin-top:3px;margin-bottom:18px}
    label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}
    input{font-size:13px;border:1px solid var(--border2);border-radius:6px;padding:8px 10px;
      background:var(--bg);color:var(--text);outline:none;margin-bottom:13px;width:100%}
    input:focus{border-color:var(--green)}
    input:disabled{opacity:.6}
    button{margin-top:5px;font-size:13px;font-weight:600;padding:9px;border:none;border-radius:6px;
      background:var(--green);color:#fff;cursor:pointer;transition:opacity .15s}
    button:hover:not(:disabled){opacity:.9}
    button:disabled{opacity:.5;cursor:default}
    .err{font-size:12px;color:var(--coral);margin-bottom:10px}
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  username = '';
  password = '';
  loading = signal(false);
  error = signal('');

  async submit() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.username, this.password);
      const redirect = this.route.snapshot.queryParamMap.get('redirect');
      // Nunca redirigir de vuelta al login: se haría un bucle.
      await this.router.navigateByUrl(redirect && !redirect.startsWith('/login') ? redirect : '/');
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'No se pudo iniciar sesión. Reintentá.');
    } finally {
      this.loading.set(false);
    }
  }
}

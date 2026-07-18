import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface SessionUser {
  username: string;
  role: 'ADMIN' | 'VIEWER';
}

/**
 * Sesión del tablero. El JWT vive en una cookie httpOnly que el navegador manda
 * sola: acá nunca se ve el token, por eso todas las llamadas van con
 * withCredentials (sin eso la cookie no viaja y todo responde 401).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly api = '/api/auth';

  readonly user = signal<SessionUser | null>(null);
  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');

  /** Evita que varios guards en cadena disparen un /me cada uno. */
  private checked = false;

  async login(username: string, password: string): Promise<SessionUser> {
    const u = await firstValueFrom(
      this.http.post<SessionUser>(`${this.api}/login`, { username, password }, { withCredentials: true })
    );
    this.user.set(u);
    this.checked = true;
    return u;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.api}/logout`, {}, { withCredentials: true }));
    } finally {
      this.clear();
    }
  }

  /** Resuelve la sesión contra el backend. Devuelve null si no hay sesión válida. */
  async me(force = false): Promise<SessionUser | null> {
    if (this.checked && !force) return this.user();
    try {
      const u = await firstValueFrom(
        this.http.get<SessionUser>(`${this.api}/me`, { withCredentials: true })
      );
      this.user.set(u);
      return u;
    } catch {
      this.user.set(null);
      return null;
    } finally {
      this.checked = true;
    }
  }

  /** Olvida la sesión local (la usa el interceptor ante un 401). */
  clear() {
    this.user.set(null);
    this.checked = false;
  }
}

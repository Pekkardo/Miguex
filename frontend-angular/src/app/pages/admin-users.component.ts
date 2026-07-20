import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { AdminUsersService } from '../services/admin-users.service';
import { TabVisibilityService } from '../services/tab-visibility.service';
import { PAGES } from '../pages';
import { TabVisibility } from '../models/tab-visibility.model';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="admin-wrap">
      <section class="card">
        <h2>Usuarios</h2>

        <table class="users-table">
          <thead>
            <tr><th>Usuario</th><th>Rol</th><th>Creado</th><th></th></tr>
          </thead>
          <tbody>
            @for (u of users.users(); track u.id) {
              <tr>
                <td>{{ u.username }}</td>
                <td>{{ u.role === 'ADMIN' ? 'Administrador' : 'Sólo lectura' }}</td>
                <td>{{ u.createdAt | date: 'short' }}</td>
                <td>
                  <button type="button" class="danger-btn"
                          [disabled]="u.username === auth.user()?.username || deleting() === u.id"
                          (click)="remove(u.id, u.username)">
                    {{ deleting() === u.id ? 'Borrando…' : 'Borrar' }}
                  </button>
                </td>
              </tr>
            }
            @if (!users.users().length) {
              <tr><td colspan="4" class="empty">No hay usuarios cargados.</td></tr>
            }
          </tbody>
        </table>

        @if (deleteError()) { <p class="err">{{ deleteError() }}</p> }

        <form class="create-form" (ngSubmit)="create()">
          <h3>Crear usuario</h3>
          <div class="row">
            <div class="field">
              <label for="nu">Usuario</label>
              <input id="nu" name="nu" type="text" autocomplete="off"
                     [(ngModel)]="newUsername" [disabled]="creating()" required>
            </div>
            <div class="field">
              <label for="np">Contraseña</label>
              <input id="np" name="np" type="password" autocomplete="new-password"
                     [(ngModel)]="newPassword" [disabled]="creating()" required>
            </div>
            <div class="field">
              <label for="nr">Rol</label>
              <select id="nr" name="nr" [(ngModel)]="newRole" [disabled]="creating()">
                <option value="VIEWER">Sólo lectura</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <button type="submit" [disabled]="creating() || !newUsername || !newPassword">
              {{ creating() ? 'Creando…' : 'Crear' }}
            </button>
          </div>
          @if (createError()) { <p class="err">{{ createError() }}</p> }
        </form>
      </section>

      <section class="card">
        <h2>Pestañas visibles para el rol lector</h2>
        <p class="sub">El administrador siempre ve las cuatro. Elegí cuáles ve el rol de sólo lectura.</p>

        <div class="tab-rows">
          @for (row of tabRows(); track row.tabKey) {
            <label class="tab-row">
              <input type="checkbox" [checked]="row.visibleForViewer"
                     (change)="toggleTab(row.tabKey, $any($event.target).checked)">
              {{ labelFor(row.tabKey) }}
            </label>
          }
        </div>

        <button type="button" [disabled]="savingTabs()" (click)="saveTabs()">
          {{ savingTabs() ? 'Guardando…' : 'Guardar visibilidad' }}
        </button>
        @if (tabsSaved()) { <p class="ok">Guardado.</p> }
        @if (tabsError()) { <p class="err">{{ tabsError() }}</p> }
      </section>
    </div>
  `,
  styles: [`
    .admin-wrap{max-width:760px;margin:24px auto;padding:0 20px;display:flex;flex-direction:column;gap:20px}
    .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);padding:22px 24px}
    h2{font-size:15px;font-weight:600;margin-bottom:12px}
    h3{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);
      margin:18px 0 10px}
    .sub{font-size:12px;color:var(--muted);margin-bottom:14px}
    .users-table{width:100%;border-collapse:collapse;font-size:13px}
    .users-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;
      color:var(--muted);padding:6px 8px;border-bottom:1px solid var(--border2)}
    .users-table td{padding:8px;border-bottom:1px solid var(--border2)}
    .empty{color:var(--muted);text-align:center;padding:16px 0}
    .danger-btn{font-size:12px;padding:4px 9px;border-radius:6px;border:1px solid var(--border2);
      background:var(--bg);color:var(--coral);cursor:pointer}
    .danger-btn:disabled{opacity:.4;cursor:default}
    .create-form .row{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap}
    .field{display:flex;flex-direction:column;min-width:150px}
    label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}
    input,select{font-size:13px;border:1px solid var(--border2);border-radius:6px;padding:8px 10px;
      background:var(--bg);color:var(--text);outline:none}
    button{font-size:13px;font-weight:600;padding:9px 14px;border:none;border-radius:6px;
      background:var(--green);color:#fff;cursor:pointer}
    button:disabled{opacity:.5;cursor:default}
    .tab-rows{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
    .tab-row{display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer}
    .err{font-size:12px;color:var(--coral);margin-top:10px}
    .ok{font-size:12px;color:var(--green);margin-top:10px}
  `]
})
export class AdminUsersComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly users = inject(AdminUsersService);
  private tabsSvc = inject(TabVisibilityService);

  newUsername = '';
  newPassword = '';
  newRole: 'ADMIN' | 'VIEWER' = 'VIEWER';

  creating = signal(false);
  createError = signal('');
  deleting = signal<number | null>(null);
  deleteError = signal('');

  tabRows = signal<TabVisibility[]>([]);
  savingTabs = signal(false);
  tabsSaved = signal(false);
  tabsError = signal('');

  private labels = new Map(PAGES.map(p => [p.id, p.label]));

  async ngOnInit() {
    await Promise.all([
      this.users.fetchUsers(),
      this.tabsSvc.fetch(true)
    ]);
    this.tabRows.set(this.tabsSvc.visibility().map(r => ({ ...r })));
  }

  labelFor(tabKey: string): string {
    return this.labels.get(tabKey) ?? tabKey;
  }

  toggleTab(tabKey: string, checked: boolean) {
    this.tabRows.update(rows => rows.map(r => r.tabKey === tabKey ? { ...r, visibleForViewer: checked } : r));
    this.tabsSaved.set(false);
  }

  async saveTabs() {
    this.savingTabs.set(true);
    this.tabsError.set('');
    this.tabsSaved.set(false);
    try {
      await this.tabsSvc.update(this.tabRows());
      this.tabRows.set(this.tabsSvc.visibility().map(r => ({ ...r })));
      this.tabsSaved.set(true);
    } catch (e: any) {
      this.tabsError.set(e?.error?.error ?? 'No se pudo guardar la visibilidad.');
    } finally {
      this.savingTabs.set(false);
    }
  }

  async create() {
    if (this.creating()) return;
    this.creating.set(true);
    this.createError.set('');
    try {
      await this.users.createUser({ username: this.newUsername, password: this.newPassword, role: this.newRole });
      this.newUsername = '';
      this.newPassword = '';
      this.newRole = 'VIEWER';
    } catch (e: any) {
      this.createError.set(e?.error?.error ?? 'No se pudo crear el usuario.');
    } finally {
      this.creating.set(false);
    }
  }

  async remove(id: number, username: string) {
    if (!confirm(`¿Borrar el usuario "${username}"?`)) return;
    this.deleting.set(id);
    this.deleteError.set('');
    try {
      await this.users.deleteUser(id);
    } catch (e: any) {
      this.deleteError.set(e?.error?.error ?? 'No se pudo borrar el usuario.');
    } finally {
      this.deleting.set(null);
    }
  }
}

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminUser, CreateUserRequest } from '../models/admin-user.model';

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private http = inject(HttpClient);
  private readonly api = '/api/admin/users';

  readonly users = signal<AdminUser[]>([]);

  async fetchUsers(): Promise<AdminUser[]> {
    const rows = await firstValueFrom(this.http.get<AdminUser[]>(this.api));
    this.users.set(rows ?? []);
    return this.users();
  }

  async createUser(req: CreateUserRequest): Promise<AdminUser> {
    const created = await firstValueFrom(this.http.post<AdminUser>(this.api, req));
    this.users.update(list => [...list, created].sort((a, b) => a.username.localeCompare(b.username)));
    return created;
  }

  async deleteUser(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.api}/${id}`));
    this.users.update(list => list.filter(u => u.id !== id));
  }
}

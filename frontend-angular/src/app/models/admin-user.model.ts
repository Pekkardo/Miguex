export interface AdminUser {
  id: number;
  username: string;
  role: 'ADMIN' | 'VIEWER';
  createdAt: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: 'ADMIN' | 'VIEWER';
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
// Use the SAME environment import path as in auth.service.ts
import { environment } from '../app/environments/environment';

export interface PendingUser {
  id: number;
  name: string;
  email: string;
  createdAt: string | null;
}

export type UserRole = 'ADMIN' | 'VIEWER';

export interface ManagedUser {
  id: number;
  name: string | null;
  email: string;
  role: UserRole;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  createdAt: string | null;
}

export interface NewUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private apiUrl = `${environment.apiUrl}/api/admin/users`;

  constructor(private http: HttpClient) {}

  // ── Pending signups ─────────────────────────────────────────

  getPendingUsers(): Observable<PendingUser[]> {
    return this.http.get<PendingUser[]>(`${this.apiUrl}/pending`, { headers: this.authHeaders() });
  }

  approve(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${id}/approve`, {}, { headers: this.authHeaders() });
  }

  reject(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${id}/reject`, {}, { headers: this.authHeaders() });
  }

  // ── User management ─────────────────────────────────────────

  getAllUsers(): Observable<ManagedUser[]> {
    return this.http.get<ManagedUser[]>(this.apiUrl, { headers: this.authHeaders() });
  }

  createUser(request: NewUserRequest): Observable<ManagedUser> {
    return this.http.post<ManagedUser>(this.apiUrl, request, { headers: this.authHeaders() });
  }

  changeRole(id: number, role: UserRole): Observable<ManagedUser> {
    return this.http.put<ManagedUser>(`${this.apiUrl}/${id}/role`, { role }, { headers: this.authHeaders() });
  }

  resetPassword(id: number, password: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}/password`, { password }, { headers: this.authHeaders() });
  }

  deleteUser(id: number, deleteOrders = false): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`, {
      headers: this.authHeaders(),
      params: { deleteOrders: String(deleteOrders) }
    });
  }

  private authHeaders(): HttpHeaders {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
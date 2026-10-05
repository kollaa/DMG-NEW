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

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private apiUrl = `${environment.apiUrl}/api/admin/users`;

  constructor(private http: HttpClient) {}

  getPendingUsers(): Observable<PendingUser[]> {
    return this.http.get<PendingUser[]>(`${this.apiUrl}/pending`, { headers: this.authHeaders() });
  }

  approve(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${id}/approve`, {}, { headers: this.authHeaders() });
  }

  reject(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${id}/reject`, {}, { headers: this.authHeaders() });
  }

  private authHeaders(): HttpHeaders {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
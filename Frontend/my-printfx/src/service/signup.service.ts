import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
// Use the SAME environment import path as in auth.service.ts
import { environment } from '../app/environments/environment';

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class SignupService {
  private apiUrl = `${environment.apiUrl}/api/customers`;

  constructor(private http: HttpClient) {}

  signup(request: SignupRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/signup`, request);
  }
}
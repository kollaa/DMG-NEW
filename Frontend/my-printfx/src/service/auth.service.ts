import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { Company } from '../Bean/company';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userSubject = new BehaviorSubject<any>(null);
  user$ = this.userSubject.asObservable();
  isLoggedIn:boolean = false;
  loggedinUser:boolean = false;

  private apiUrl = 'http://localhost:8080/api/customers';

  constructor(private http: HttpClient, private router: Router) {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedUser = localStorage.getItem('username');
      if (storedUser) {
        this.userSubject.next(storedUser); 
      }
    }

  }

  login(credentials: { username: string; password: string; rememberMe?: boolean }): Observable<any> {
    console.log("Login attempt by:", credentials.rememberMe);
    
    return this.http.post<{ token: string; username: string; rememberMe?: boolean}>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response.token) {
          if (credentials.rememberMe) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('username', response.username);
          } else {
            sessionStorage.setItem('token', response.token);
            sessionStorage.setItem('username', response.username);
          }   
          this.isLoggedIn = true;
          this.loggedinUser = true;
        }
      }),
      catchError(this.handleError)
    );
  }
  
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    
    if (error.status === 401) {
      errorMessage = 'Invalid credentials';  // Customize error message
    } else if (error.status === 0) {
      errorMessage = 'No internet connection';  // Handle connection errors
    }

    return throwError(() => new Error(errorMessage));
  }


  resetPassword(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/password-reset`, { username, password },{responseType: 'text'});
  }

  sendPasswordResetEmail(credentials:{username: string}): Observable<any> {
    
    return this.http.post(`${this.apiUrl}/forgot-password`, credentials);
  }

  verifyOtp(username:string, otp: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-otp`, { username, otp });
  }

  getCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.apiUrl}/company`);
  }

  logOut() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      this.isLoggedIn = false;
      this.loggedinUser = false ;
      this.router.navigate(['/login'])
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('username');
    }
    this.userSubject.next(null);
  }

  getUser() {
    return this.userSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

}
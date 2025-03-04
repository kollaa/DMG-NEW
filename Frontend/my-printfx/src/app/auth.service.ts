import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';

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

  login(credentials: { username: string; password: string }): Observable<any> {
    console.log("login" + credentials.username ) ;
    return this.http.post<{ token: string; username: string }>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem('token', response.token);  
          localStorage.setItem('username', response.username); 
          console.log("User logged in successfully:", response.username);
          console.log("User logged in successfully:", response.token);
          this.isLoggedIn = true;
          this.loggedinUser=true;
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

  logOut() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      this.isLoggedIn = false;
      this.loggedinUser = false ;
      this.router.navigate(['/login'])
    }
    this.userSubject.next(null);
  }

  getUser() {
    return this.userSubject.value;
  }

}
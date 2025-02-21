import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/customers';

  constructor(private http: HttpClient) {}

  login(credentials: { username: string; password: string }): Observable<any> {
    console.log("login" + credentials ) ;
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      catchError(this.handleError));
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
    //console.log("email: ", username );  // Log the email value
    return this.http.post(`${this.apiUrl}/forgot-password`, credentials);
  }

  verifyOtp(username:string, otp: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-otp`, { username, otp });
  }

}
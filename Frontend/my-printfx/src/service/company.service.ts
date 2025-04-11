import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { Company } from '../Bean/company';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {


  private apiUrl = 'http://localhost:8080/api/customers';

  constructor(private http: HttpClient, private router: Router) { }

  getCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.apiUrl}/company`);
  }

  addCompany(formData: FormData): Observable<Company> {
    return this.http.post<Company>(`${this.apiUrl}/companies`, formData);
  }
  
  
}

// src/app/service/company-context.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Company } from '../Bean/company';

@Injectable({ providedIn: 'root' })
export class CompanyContextService {
  private companySubject = new BehaviorSubject<Company | null>(null);
  company$ = this.companySubject.asObservable();

  setCompany(company: Company | null): void {
    this.companySubject.next(company);
  }

  clearCompany(): void {
    this.companySubject.next(null);
  }
}
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product} from '../Bean/product';
import { Company } from '../Bean/company';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private apiUrl = 'http://localhost:8080/api/companies';

  constructor(private http: HttpClient) {}

  getCompany(companyId: number): Observable<Company> {
  return this.http.get<Company>(`${this.apiUrl}/${companyId}`);  // apiUrl = http://localhost:8080/api/companies
}
  getProductsByCompany(companyId: number): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/${companyId}/products`);
  }
} 
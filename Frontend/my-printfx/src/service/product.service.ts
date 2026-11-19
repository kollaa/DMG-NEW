import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Product} from '../Bean/product';
import { Company } from '../Bean/company';
import { resolveFileUrl } from '../Bean/order-config';
import { environment } from '../app/environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private apiUrl =  `${environment.apiUrl}/api/companies`;

  constructor(private http: HttpClient) {}

  getCompany(companyId: number): Observable<Company> {
  return this.http.get<Company>(`${this.apiUrl}/${companyId}`);  // apiUrl = http://localhost:8080/api/companies
}
  // Image paths may be stored relative ("/images/x.jpg") so the same database
  // value works locally and on Azure; they are served by the backend.
  getProductsByCompany(companyId: number): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/${companyId}/products`).pipe(
      map(products => products.map(p => ({
        ...p,
        imageUrl: p.imageUrl ? resolveFileUrl(p.imageUrl) : p.imageUrl,
        imageUrlBack: p.imageUrlBack ? resolveFileUrl(p.imageUrlBack) : p.imageUrlBack
      })))
    );
  }
}

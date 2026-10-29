import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Category, CategoryList } from '../Bean/Category';
import { environment } from '../app/environments/environment';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly apiUrl = `${environment.apiUrl}/api/companies`;

  constructor(private http: HttpClient) {}

  getCategories(companyId: number): Observable<CategoryList> {
    return this.http.get<CategoryList>(`${this.apiUrl}/${companyId}/categories`);
  }

  /** categoryKey is a category id, or 'uncategorized' */
  getProductIds(companyId: number, categoryKey: string | number): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/${companyId}/categories/${categoryKey}/product-ids`);
  }

  // ── Admin only ──────────────────────────────────────────────

  createCategory(companyId: number, name: string): Observable<Category> {
    return this.http.post<Category>(`${this.apiUrl}/${companyId}/categories`, { name }, { headers: this.authHeaders() });
  }

  assignProduct(companyId: number, categoryId: number, productId: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.apiUrl}/${companyId}/categories/${categoryId}/products/${productId}`, {}, { headers: this.authHeaders() });
  }

  deleteCategory(companyId: number, categoryId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/${companyId}/categories/${categoryId}`, { headers: this.authHeaders() });
  }

  private authHeaders(): HttpHeaders {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
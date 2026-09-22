import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { CartItem } from '../Bean/cart-item';

@Injectable({
  providedIn: 'root'
})
export class CartService {

  // Matches the same host order.component.ts already uses for the backend.
  private readonly apiUrl = 'http://localhost:8080/api/orders';

  private itemsSubject = new BehaviorSubject<CartItem[]>([]);
  items$ = this.itemsSubject.asObservable();

  constructor(private http: HttpClient) {
    // Deliberately NOT calling refresh() here. This service is instantiated
    // as soon as the app boots (AppComponent injects it for the cart badge),
    // which happens before login — hitting the backend before a token
    // exists just produces noise. Call refresh() explicitly once you know
    // the user is authenticated (e.g. from AppComponent after confirming
    // loggedinUser(), or right after a successful login in AuthService).
  }

  get items(): CartItem[] {
    return this.itemsSubject.value;
  }

  get total(): number {
    // Only "ready" items count toward checkout total — in-progress
    // items haven't been submitted yet.
    return this.items
      .filter(i => i.status === 'ready')
      .reduce((sum, i) => sum + i.price, 0);
  }

  // Re-pulls the full order list from the backend and pushes it to every
  // subscriber (navbar badge, cart page, etc.). Call this after any
  // create/update/delete so everything stays in sync.
  refresh(): void {
    this.http.get<CartItem[]>(this.apiUrl).subscribe({
      next: items => {
        // The backend stores formDetails as a JSON-encoded string (it's a
        // plain String column, not a structured object). Parse it back
        // into a real object here so the rest of the app can keep treating
        // CartItem.formDetails as the object it actually is.
        const parsed = items.map(i => ({
          ...i,
          formDetails: this.parseFormDetails(i.formDetails)
        }));
        this.itemsSubject.next(parsed);
      },
      error: err => console.error('Failed to load orders from server', err)
    });
  }

  addItem(item: Omit<CartItem, 'id' | 'orderCode' | 'modifiedDate'>): void {
    const payload = this.toWirePayload(item);
    this.http.post<CartItem>(this.apiUrl, payload).subscribe({
      next: () => this.refresh(),
      error: err => console.error('Failed to save order', err)
    });
  }

  duplicateItem(id: number): void {
    this.http.post<CartItem>(`${this.apiUrl}/${id}/duplicate`, {}).subscribe({
      next: () => this.refresh(),
      error: err => console.error('Failed to duplicate order', err)
    });
  }

  removeItem(id: number): void {
    this.http.delete<void>(`${this.apiUrl}/${id}`).subscribe({
      next: () => this.refresh(),
      error: err => console.error('Failed to delete order', err)
    });
  }

  updateQuantity(id: number, quantity: number, newPrice?: number): void {
    const existing = this.items.find(i => i.id === id);
    if (!existing) return;

    const updated = {
      ...existing,
      quantity,
      price: newPrice ?? existing.price
    };

    const payload = this.toWirePayload(updated);
    this.http.put<CartItem>(`${this.apiUrl}/${id}`, payload).subscribe({
      next: () => this.refresh(),
      error: err => console.error('Failed to update order', err)
    });
  }

  // Finalizes a batch of "ready" orders (the checkout page's Submit
  // button). Returns an Observable so the checkout component can react to
  // success/failure directly (show a confirmation, navigate away, show an
  // error) rather than this service deciding that on its own.
  checkout(orderIds: number[]): Observable<CartItem[]> {
    return this.http
      .post<CartItem[]>(`${this.apiUrl}/checkout`, { orderIds })
      .pipe(
        map(items => items.map(i => ({
          ...i,
          formDetails: this.parseFormDetails(i.formDetails)
        })))
      );
  }

  // Approves a pending order — called from the notification dropdown's
  // "Approve" button. Backend returns { order, selfApproved } — selfApproved
  // tells the caller whether the approver IS the order's original
  // requester, so AppComponent knows whether to redirect straight to the
  // Payment page or just refresh/close the dropdown.
  approveOrder(id: number): Observable<{ order: CartItem; selfApproved: boolean }> {
    return this.http
      .put<{ order: CartItem; selfApproved: boolean }>(`${this.apiUrl}/${id}/approve`, {})
      .pipe(
        map(res => ({
          ...res,
          order: { ...res.order, formDetails: this.parseFormDetails(res.order.formDetails) }
        }))
      );
  }

  // Fetches a single order by id, regardless of who owns it — used by the
  // Payment page, since viewing/paying for someone else's order means it
  // won't be in your own `items` list.
  getOrderById(id: number): Observable<CartItem> {
    return this.http.get<CartItem>(`${this.apiUrl}/${id}`).pipe(
      map(i => ({ ...i, formDetails: this.parseFormDetails(i.formDetails) }))
    );
  }

  // Called from the Payment page's "Pay" button. Ownership is checked on
  // the backend — only the original requester can pay for their own order.
  // Not real payment processing; this app has no payment gateway.
  payOrder(id: number): Observable<CartItem> {
    return this.http.put<CartItem>(`${this.apiUrl}/${id}/pay`, {}).pipe(
      map(i => ({ ...i, formDetails: this.parseFormDetails(i.formDetails) }))
    );
  }

  // Called from the notification dropdown's "Reject" button.
  rejectOrder(id: number): Observable<CartItem> {
    return this.http.put<CartItem>(`${this.apiUrl}/${id}/reject`, {}).pipe(
      map(i => ({ ...i, formDetails: this.parseFormDetails(i.formDetails) }))
    );
  }

  // Full update for an existing order — used when editing a cart item
  // (as opposed to updateQuantity(), which only touches quantity/price).
  // Overwrites everything the order.component form/canvas produced:
  // quantity, price, formDetails, both thumbnails, and status/percentComplete.
  updateOrder(id: number, item: Partial<CartItem>): Observable<CartItem> {
    const payload = this.toWirePayload(item);
    return this.http.put<CartItem>(`${this.apiUrl}/${id}`, payload).pipe(
      map(i => ({ ...i, formDetails: this.parseFormDetails(i.formDetails) }))
    );
  }

  // ── Internal helpers ────────────────────────────────────────────

  // Converts an in-memory CartItem (formDetails as a real object) into the
  // shape the backend expects (formDetails as a JSON string), for
  // POST/PUT bodies.
  private toWirePayload(item: any): any {
    return {
      ...item,
      formDetails: item.formDetails ? JSON.stringify(item.formDetails) : null
    };
  }

  private parseFormDetails(raw: any): any {
    if (typeof raw !== 'string' || !raw) return raw ?? null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw; // wasn't valid JSON — return as-is rather than throw
    }
  }
}
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CartService } from '../../service/cart.service';
import { CartItem } from '../../Bean/cart-item';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
export class CartComponent implements OnInit, OnDestroy {

  readyItems: CartItem[] = [];
  inProgressItems: CartItem[] = [];
  pendingPaymentItems: CartItem[] = [];
  sortOrder: 'new-old' | 'old-new' = 'new-old';
  private sub?: Subscription;

  constructor(private cartService: CartService, private router: Router) {}

  ngOnInit(): void {
    this.sub = this.cartService.items$.subscribe(items => {
      this.applySort(items);
    });
    // Always pull fresh data when this page is opened, rather than relying
    // on some other action (add/duplicate/etc.) having already triggered a
    // refresh as a side effect.
    this.cartService.refresh();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private applySort(items: CartItem[]): void {
    const sorted = [...items].sort(
      (a, b) => new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime()
    );
    const ordered = this.sortOrder === 'new-old' ? sorted : sorted.reverse();
    this.readyItems = ordered.filter(i => i.status === 'ready');
    this.inProgressItems = ordered.filter(i => i.status === 'in-progress');
    // Shows the requester their order has been approved and is now
    // awaiting payment — a visible checkpoint between approval and
    // final submission, even though the requester isn't the one who
    // actually completes the payment step.
    this.pendingPaymentItems = ordered.filter(i => i.status === 'pending_payment');
  }

  onSortChange(value: string): void {
    this.sortOrder = value === 'old-new' ? 'old-new' : 'new-old';
    this.applySort(this.cartService.items);
  }

  get total(): number {
    // Only "ready" items count toward checkout total — in-progress
    // items haven't been submitted yet.
    return this.readyItems.reduce((sum, i) => sum + i.price, 0);
  }

  editItem(item: CartItem): void {
    // Passes the order's id as a query param so OrderComponent can fetch
    // its saved formDetails and pre-fill the form, instead of opening a
    // blank customize page.
    this.router.navigate(['/order', item.companyId, item.productId], {
      queryParams: { editOrderId: item.id }
    });
  }

  duplicateItem(item: CartItem): void {
    this.cartService.duplicateItem(item.id);
  }

  removeItem(item: CartItem): void {
    this.cartService.removeItem(item.id);
  }

  payNow(item: CartItem): void {
    this.router.navigate(['/payment', item.id]);
  }

  returnToProducts(): void {
    this.router.navigate(['/dashboard']);
  }

  proceedToCheckout(): void {
    this.router.navigate(['/checkout']);
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../service/cart.service';
import { CartItem } from '../../Bean/cart-item';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent implements OnInit {

  readyItems: CartItem[] = [];
  submitting = false;
  submitted = false;
  errorMessage: string | null = null;

  constructor(private cartService: CartService, private router: Router) {}

  ngOnInit(): void {
    // Snapshot the current ready items for review. Pulling from the
    // already-loaded cart state (rather than re-fetching) keeps this in
    // sync with whatever the user just saw on the cart page.
    this.readyItems = this.cartService.items.filter(i => i.status === 'ready');

    if (this.readyItems.length === 0) {
      // Nothing to check out — send them back rather than showing an
      // empty review page.
      this.router.navigate(['/cart']);
    }
  }

  get total(): number {
    return this.readyItems.reduce((sum, i) => sum + i.price, 0);
  }

  submitOrder(): void {
    if (this.submitting || this.readyItems.length === 0) return;

    this.submitting = true;
    this.errorMessage = null;

    const orderIds = this.readyItems.map(i => i.id);

    this.cartService.checkout(orderIds).subscribe({
      next: () => {
        this.cartService.refresh();
        this.submitting = false;
        this.submitted = true;
      },
      error: (err) => {
        console.error('Checkout failed', err);
        this.submitting = false;
        this.errorMessage = 'Something went wrong submitting your order. Please try again.';
      }
    });
  }

  cancelCheckout(): void {
    this.router.navigate(['/cart']);
  }

  returnToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
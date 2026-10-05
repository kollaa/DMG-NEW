import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../../service/cart.service';
import { CartItem } from '../../Bean/cart-item';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css'
})
export class PaymentComponent implements OnInit {

  order: CartItem | null = null;
  loading = true;
  paying = false;
  paid = false;
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cartService.getOrderById(id).subscribe({
      next: order => {
        this.order = order;
        this.loading = false;
      },
      error: err => {
        console.error('Failed to load order', err);
        this.errorMessage = 'Could not load this order.';
        this.loading = false;
      }
    });
  }

  pay(): void {
    if (!this.order || this.paying) return;

    this.paying = true;
    this.errorMessage = null;

    this.cartService.payOrder(this.order.id).subscribe({
      next: order => {
        this.order = order;
        this.paying = false;
        this.paid = true;
        this.cartService.refresh();
      },
      error: err => {
        console.error('Payment failed', err);
        this.paying = false;
        this.errorMessage = 'Something went wrong. Please try again.';
      }
    });
  }

  returnToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
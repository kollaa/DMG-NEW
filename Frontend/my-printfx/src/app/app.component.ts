import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../service/auth.service';
import { CompanyContextService } from '../service/company-contextservice';
import { CartService } from '../service/cart.service';
import { NotificationService } from '../service/notification.service';
import { Company } from '../Bean/company';
import { AppNotification } from '../Bean/Notification';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  user: any = null;
  activeCompany: Company | null = null;
  backendUrl = 'http://localhost:8080';
  cartCount = 0;
  showNotifications = false;
  notifications: AppNotification[] = [];

  // ── Hardcoded per-company navbar colors ──────────────────────────
  // Key must match Company.name exactly as it comes from the backend.
  private companyColors: Record<string, string> = {
    'Scott':         '#1a237e',
    'Greenway':      '#2e7d32',
    'Precise':       '#000000',
    'Holden Conner': '#3e4f3e'
  };
  private defaultNavbarColor = '#ffffff';

  private cartSub?: Subscription;
  private notificationSub?: Subscription;

  constructor(
    private router: Router,
    private authService: AuthService,
    private companyContext: CompanyContextService,
    private cartService: CartService,
    private notificationService: NotificationService
  ) {
    this.authService.user$.subscribe(user => {
      this.user = user;
    });

    // Switch logo when entering/leaving a company products page
    this.companyContext.company$.subscribe(company => {
      this.activeCompany = company;
    });
  }

  ngOnInit(): void {
    this.router.navigate(['/login']);

    this.cartSub = this.cartService.items$.subscribe(items => {
      // Only count items still actually "in the cart" — once an order is
      // submitted (or pending approval), it's done, and shouldn't keep
      // inflating the badge just because it's still a row in the database.
      this.cartCount = items.filter(
        i => i.status === 'ready' || i.status === 'in-progress'
      ).length;
    });

    this.notificationSub = this.notificationService.notifications$.subscribe(items => {
      // Only show unread ones. Without this filter, an already-handled
      // notification (approved or rejected) stays visible with its
      // Approve/Reject buttons still clickable, and clicking either one
      // again throws a "not pending approval" error on the backend — the
      // order already moved past that status, but nothing here told the
      // user this notification was stale.
      this.notifications = items.filter(n => !n.read);
    });

    if (this.loggedinUser()) {
      this.cartService.refresh();
      this.notificationService.refresh();
    }
  }

  ngOnDestroy(): void {
    this.cartSub?.unsubscribe();
    this.notificationSub?.unsubscribe();
  }

  logout() {
    this.authService.logOut();
  }

  loggedinUser() {
    return this.authService.loggedinUser;
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.notificationService.refresh();
    }
  }

  // Approves the order tied to this notification. If the approver IS the
  // order's original requester (self-approval), redirect straight to the
  // Payment page. Otherwise, just mark the notification read and refresh —
  // the actual requester will see this order waiting for them under
  // "Approved — Awaiting Payment" next time they check their own cart.
  approveFromNotification(notification: AppNotification): void {
    this.cartService.approveOrder(notification.orderId).subscribe({
      next: ({ order, selfApproved }) => {
        this.notificationService.markRead(notification.id);
        this.cartService.refresh();
        this.showNotifications = false;

        if (selfApproved) {
          this.router.navigate(['/payment', order.id]);
        }
      },
      error: err => {
        console.error('Failed to approve order', err);
        // Most likely cause: someone already acted on this order (or you
        // double-clicked). Mark it read anyway so it stops showing as an
        // actionable item — refresh() will pull the current real state.
        this.notificationService.markRead(notification.id);
      }
    });
  }

  // Rejects the order tied to this notification. No redirect needed —
  // just marks the notification read and refreshes. The requester gets
  // their own notification about the rejection from the backend.
  rejectFromNotification(notification: AppNotification): void {
    this.cartService.rejectOrder(notification.orderId).subscribe({
      next: () => {
        this.notificationService.markRead(notification.id);
        this.cartService.refresh();
      },
      error: err => {
        console.error('Failed to reject order', err);
        this.notificationService.markRead(notification.id);
      }
    });
  }

  // For informational notifications (rejection notices) that have no
  // Approve/Reject action — just marks it read so it drops off the list.
  dismissNotification(notification: AppNotification): void {
    this.notificationService.markRead(notification.id);
  }

  get navbarColor(): string {
    if (this.activeCompany?.name && this.companyColors[this.activeCompany.name]) {
      return this.companyColors[this.activeCompany.name];
    }
    return this.defaultNavbarColor;
  }
}
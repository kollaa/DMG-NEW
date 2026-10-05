import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../service/auth.service';
import { CompanyContextService } from '../service/company-contextservice';
import { CartService } from '../service/cart.service';
import { NotificationService } from '../service/notification.service';
import { AdminUserService } from '../service/admin-user.service';
import { Company } from '../Bean/company';
import { AppNotification } from '../Bean/Notification';

// Pages a logged-out visitor may open directly (e.g. from a link or a refresh)
const PUBLIC_PATHS = ['/login', '/signup', '/forgotpassword', '/password-reset', '/verify-otp'];

// Backup check in case the live connection is ever down.
// Normally the bell updates instantly through NotificationService.connect().
const NOTIFICATION_POLL_MS = 60_000;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  user: any = null;
  activeCompany: Company | null = null;
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
  private pollSub?: Subscription;
  private navSub?: Subscription;

  constructor(
    private router: Router,
    private authService: AuthService,
    private companyContext: CompanyContextService,
    private cartService: CartService,
    private notificationService: NotificationService,
    private adminUserService: AdminUserService
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
    // Previously this always navigated to /login, which made /signup (and the
    // forgot-password pages) impossible to open directly. Now logged-out users
    // are only sent to /login if they're not already on a public page.
    const path = typeof window !== 'undefined' ? window.location.pathname : '/login';
    if (!this.loggedinUser() && !PUBLIC_PATHS.some(p => path.startsWith(p))) {
      this.router.navigate(['/login']);
    }

    this.cartSub = this.cartService.items$.subscribe(items => {
      // Only count items still actually "in the cart"
      this.cartCount = items.filter(
        i => i.status === 'ready' || i.status === 'in-progress'
      ).length;
    });

    this.notificationSub = this.notificationService.notifications$.subscribe(items => {
      // Only show unread ones, so handled notifications don't keep
      // offering Approve/Reject buttons.
      this.notifications = items.filter(n => !n.read);
    });

    if (this.loggedinUser()) {
      this.cartService.refresh();
      this.notificationService.refresh();
      this.notificationService.connect();
    }

    // Keep the bell up to date without having to click it:
    // 1. after every page change (this also covers right after logging in)
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.refreshNotificationsIfLoggedIn());

    // 2. every 30 seconds while the tab is visible
    this.pollSub = interval(NOTIFICATION_POLL_MS)
      .subscribe(() => this.refreshNotificationsIfLoggedIn());
  }

  // 3. as soon as the user comes back to this browser tab
  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    this.refreshNotificationsIfLoggedIn();
  }

  private refreshNotificationsIfLoggedIn(): void {
    if (!this.loggedinUser()) {
      return;
    }
    // Make sure the live connection is open (no-op if it already is).
    // This also opens it right after logging in.
    this.notificationService.connect();

    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return; // don't poll a hidden tab
    }
    this.notificationService.refresh();
  }

  ngOnDestroy(): void {
    this.cartSub?.unsubscribe();
    this.notificationSub?.unsubscribe();
    this.pollSub?.unsubscribe();
    this.navSub?.unsubscribe();
  }

  logout() {
    this.notificationService.disconnect();
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    this.authService.logOut();
  }

  get displayName(): string {
    if (this.user) {
      return this.user;
    }
    return typeof window !== 'undefined' ? (localStorage.getItem('username') ?? '') : '';
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

  // ── Order approval notifications ─────────────────────────────────

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
        this.notificationService.markRead(notification.id);
      }
    });
  }

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

  // ── Signup approval notifications ────────────────────────────────
  // The backend marks every admin's copy of the signup notification as
  // read when approving/rejecting, so a refresh() is enough afterwards.

  approveSignupFromNotification(notification: AppNotification): void {
    if (notification.relatedUserId == null) {
      this.notificationService.markRead(notification.id);
      return;
    }
    this.adminUserService.approve(notification.relatedUserId).subscribe({
      next: () => this.notificationService.refresh(),
      error: err => {
        console.error('Failed to approve signup', err);
        this.notificationService.markRead(notification.id);
      }
    });
  }

  rejectSignupFromNotification(notification: AppNotification): void {
    if (notification.relatedUserId == null) {
      this.notificationService.markRead(notification.id);
      return;
    }
    if (!confirm('Reject this signup request?')) {
      return;
    }
    this.adminUserService.reject(notification.relatedUserId).subscribe({
      next: () => this.notificationService.refresh(),
      error: err => {
        console.error('Failed to reject signup', err);
        this.notificationService.markRead(notification.id);
      }
    });
  }

  // For informational notifications (e.g. rejection notices)
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
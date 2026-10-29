import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { PasswordResetComponent } from './password-reset/password-reset.component';
import { VerifyOtpComponent } from './verify-otp/verify-otp.component';
import { PrintFxComponent } from './print-fx/print-fx.component';
import { CategoriesComponent } from './categories/categories.component';
import { ProductsComponent } from './products/products.component';
import { AddCompanyComponentComponent } from './add-company-component/add-company-component.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { OrderComponent } from './order/order.component';
import { CartComponent } from './cart/cart.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { PaymentComponent } from './payment/payment.component';
import { authLoginGuard } from './auth-login.guard';
import { authGuard } from './auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  // ── Public pages ─────────────────────────────────────────
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [authLoginGuard]
  },
  {
    path: 'signup',
    component: SignupComponent,
    canActivate: [authLoginGuard]
  },
  {
    path: 'forgotpassword',
    component: ForgotPasswordComponent
  },
  {
    path: 'password-reset',
    component: PasswordResetComponent
  },
  {
    path: 'verify-otp',
    component: VerifyOtpComponent
  },

  // ── Logged-in pages ──────────────────────────────────────
  {
    path: 'dashboard',
    component: PrintFxComponent,
    canActivate: [authGuard]
  },
  {
    // Company -> category tiles
    path: 'products/:id',
    component: CategoriesComponent,
    canActivate: [authGuard]
  },
  {
    // Category -> its products ('all', 'uncategorized', or a category id)
    path: 'products/:id/category/:categoryId',
    component: ProductsComponent,
    canActivate: [authGuard]
  },
  { path: 'order/:companyId/:productId', component: OrderComponent },
  { path: 'cart', component: CartComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'payment/:id', component: PaymentComponent },

  // ── Admin-only pages ─────────────────────────────────────
  {
    path: 'addcompany',
    component: AddCompanyComponentComponent,
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'addproduct/:id',
    loadComponent: () =>
      import('./add-product-component/add-product-component.component')
        .then(m => m.AddProductComponentComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/users',
    component: AdminUsersComponent,
    canActivate: [authGuard, adminGuard]
  },

  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  }
];
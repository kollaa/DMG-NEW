import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { PasswordResetComponent } from './password-reset/password-reset.component';
import { VerifyOtpComponent } from './verify-otp/verify-otp.component';
import { PrintFxComponent } from './print-fx/print-fx.component';
import { ProductsComponent } from './products/products.component';
import { AddCompanyComponentComponent } from './add-company-component/add-company-component.component';
import { authLoginGuard } from './auth-login.guard';
import { authGuard } from './auth.guard';
import { OrderComponent } from './order/order.component';
import { CartComponent } from './cart/cart.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { PaymentComponent } from './payment/payment.component';
import { SignupComponent } from './signup/signup.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { 
    path: 'login', 
    component: LoginComponent, 
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
  { 
    path: 'dashboard', 
    component: PrintFxComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'addcompany', 
    component: AddCompanyComponentComponent,
    canActivate: [authGuard, adminGuard]
  },
  { 
    path: 'products/:id', 
    component: ProductsComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'addproduct/:id',
    loadComponent: () =>
      import('./add-product-component/add-product-component.component')
      .then(m => m.AddProductComponentComponent),
    canActivate: [authGuard, adminGuard]        // ← added
  },
  {
    path: 'signup',
    component: SignupComponent,
    canActivate: [authLoginGuard]
  },
  {
    path: 'admin/users',
    component: AdminUsersComponent,
    canActivate: [authGuard]
  },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'payment/:id', component: PaymentComponent},
  { path: 'cart', component: CartComponent },
  { path: 'order/:companyId/:productId', component: OrderComponent },
  { 
    path: '', 
    redirectTo: '/login', 
    pathMatch: 'full' 
  }
];
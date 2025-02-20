import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { PasswordResetComponent } from './password-reset/password-reset.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent},
    { path: 'forgotpassword', component: ForgotPasswordComponent},
    { path: 'password-reset', component: PasswordResetComponent},
    { path: '', redirectTo: '/login', pathMatch: 'full' }
];


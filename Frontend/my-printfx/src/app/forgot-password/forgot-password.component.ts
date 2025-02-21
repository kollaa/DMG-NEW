import { Component, inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';
import {  Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule,FormsModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  errorMessage: string = '';
  forgotPasswordForm: FormGroup;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.forgotPasswordForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]]
    });
  }

  onForgotPassword(): void {
    if (this.forgotPasswordForm.valid) {
      const email = this.forgotPasswordForm.value;
      console.log(email);
      // Use AuthService to make the API call
      this.authService.sendPasswordResetEmail(email).subscribe(
        (response: any) => {
          // Navigate to reset-password page with email as a query parameter
          console.log("success" + response.email);
          this.router.navigate(['/verify-otp'], { queryParams: { email: response.email } });
        },
        (err: any) => { 
          this.errorMessage = err.error.error
          console.log(this.errorMessage);
        }
      );
    }

  }

}

import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule,FormsModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {

  forgotPasswordForm: FormGroup;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onForgotPassword(): void {
    if (this.forgotPasswordForm.valid) {
      const email = this.forgotPasswordForm.value.email;
      console.log('checking the email'+ email);
      
      this.authService.sendPasswordResetEmail(email).subscribe({
        next: (response) => {
          console.log('Reset link sent:', response.message);
          alert('A password reset link has been sent to your email.');
        },
        error: (error) => {
          console.error('Error sending reset link:', error);
          alert('An error occurred while sending the password reset email.');
        },
      });
    } else {
      alert('Please enter a valid email address.');
    }
  }

}

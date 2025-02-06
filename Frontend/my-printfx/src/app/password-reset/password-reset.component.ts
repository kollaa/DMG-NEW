import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-password-reset',
  imports: [],
  templateUrl: './password-reset.component.html',
  styleUrl: './password-reset.component.css'
})
export class PasswordResetComponent {
  passwordResetForm: FormGroup;
  token: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.passwordResetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    });

    this.route.queryParams.subscribe((params) => {
      this.token = params['token']; // Extract token from the query parameters
    });
  }

  onSubmit(): void {
    if (this.passwordResetForm.valid) {
      const { password, confirmPassword } = this.passwordResetForm.value;

      if (password !== confirmPassword) {
        alert('Passwords do not match.');
        return;
      }
      this.authService.resetPassword(this.token, password).subscribe({
        next: (response) => {
          alert('Password reset successfully.');
          console.log(response);
        },
        error: (error) => {
          alert('An error occurred while resetting the password.');
          console.error(error);
        },
      });
    }
  }

}

import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../service/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-password-reset',
  imports: [CommonModule,FormsModule, ReactiveFormsModule],
  templateUrl: './password-reset.component.html',
  styleUrl: './password-reset.component.css'
})
export class PasswordResetComponent {
  passwordResetForm: FormGroup;
  username: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {
    this.passwordResetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.username = params['email'];
      console.log('Email from query params:', this.username);
    });
  }

  onSubmit(): void {
    if (this.passwordResetForm.valid) {
      const { password, confirmPassword } = this.passwordResetForm.value;

      if (password !== confirmPassword) {
        alert('Passwords do not match.');
        return;
      }
      this.authService.resetPassword(this.username, password).subscribe({
        next: (response: any) => {
          this.router.navigate(['login'])
          alert('Password reset successfully.');
        },
        error: (error: any) => {
          alert('An error occurred while resetting the password.');
          console.error(error);
        },
      });
    }
  }

}

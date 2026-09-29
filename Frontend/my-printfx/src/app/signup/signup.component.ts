import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule,
  ValidationErrors, ValidatorFn, Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SignupService } from '../../service/signup.service';

const passwordsMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
};

@Component({
  selector: 'app-signup',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrls: ['../login/login.component.css', './signup.component.css']
})
export class SignupComponent {
  signupForm: FormGroup;
  errorMessage = '';
  successMessage = '';
  submitting = false;

  constructor(private fb: FormBuilder, private signupService: SignupService) {
    this.signupForm = this.fb.group(
      {
        name: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: passwordsMatch }
    );
  }

  showError(field: string): boolean {
    const control = this.signupForm.get(field);
    return !!control && control.invalid && control.touched;
  }

  get mismatch(): boolean {
    return this.signupForm.hasError('passwordMismatch') && !!this.signupForm.get('confirmPassword')?.touched;
  }

  onSubmit(): void {
    this.errorMessage = '';
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.signupForm.value;
    this.submitting = true;

    this.signupService.signup({ name, email, password }).subscribe({
      next: (res) => {
        this.submitting = false;
        this.successMessage = res.message;
        this.signupForm.reset();
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err?.error?.error || 'Signup failed. Please try again.';
      }
    });
  }
}
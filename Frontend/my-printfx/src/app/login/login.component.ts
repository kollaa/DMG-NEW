import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-login',
   imports: [RouterLink, FormsModule, ReactiveFormsModule, CommonModule,],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';

  
  constructor(private authService: AuthService, private fb: FormBuilder, private router: Router) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const formValues = this.loginForm.value;
      console.log('Form Submitted:', formValues);

      // Use form values for login
      this.authService.login({ username: formValues.email, password: formValues.password }).subscribe(
        (response: any) => {
          if (response.token) {
            localStorage.setItem('token', response.token);  // Store token in localStorage
            //this.router.navigate(['/dashboard']);  // Redirect to dashboard upon success
            console.log('Login Successful');
          }
        },
        (error) => {
          this.errorMessage = error.message;  // Display error message from the backend
          console.error('Login failed:', error);  // Handle errors
        }

      );
    } else {
      console.log('Form is invalid');
    }
  }
}

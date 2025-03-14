import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../service/auth.service';
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
      password: ['', [Validators.required]],
      rememberMe: [false]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const formValues = this.loginForm.value;
      console.log('Form Submitted:', formValues);

      
      this.authService.login({ username: formValues.email, password: formValues.password, rememberMe: formValues.rememberMe }).subscribe(
        (response: any) => {
          if (response.token) {
            localStorage.setItem('token', response.token);  
            this.router.navigate(['/dashboard']); 
            console.log('Login Successful');
          }
        },
        (error) => {
          this.errorMessage = error.message;  // Display error message from the backend
          console.error('Login failed:', error); 
        }

      );
    } else {
      console.log('Form is invalid');
    }
  }
}

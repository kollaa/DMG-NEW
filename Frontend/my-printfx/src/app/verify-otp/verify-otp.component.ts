import { Component } from '@angular/core';
import { AuthService } from '../../service/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verify-otp',
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './verify-otp.component.html',
  styleUrl: './verify-otp.component.css'
})
export class VerifyOtpComponent {   
  otpForm: FormGroup;
  message: string = '';
  email: string = '';

  constructor(
    private authService: AuthService, 
    private router: Router, 
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'];
      console.log('Email from query params:', this.email);
    });
  }
  
  verifyOtp() {
    if (this.otpForm.invalid) {
      this.message = 'Please enter a valid OTP';
      return;
    }
    
    const otp = this.otpForm.value.otp;
    this.authService.verifyOtp(this.email, otp).subscribe({
      next: () => {
        this.router.navigate(['/password-reset'], { queryParams: { email: this.email }});
      },
      error: () => {
        this.message = 'Invalid OTP. Try again.';
      }
    });
  }
}

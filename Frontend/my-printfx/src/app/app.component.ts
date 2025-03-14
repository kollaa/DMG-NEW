import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../service/auth.service';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  user: any = null;
  
  constructor(private router: Router, private authService: AuthService) {

    this.authService.user$.subscribe(user =>
    {
      this.user = user;
    }
    )
  }
  
  ngOnInit(): void {
    this.router.navigate(['/login']);
  }

  logout() {
    this.authService.logOut();
  }

  loggedinUser() {
    return this.authService.loggedinUser;
  }

}


import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';

export const authLoginGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Guard against SSR — localStorage/sessionStorage don't exist in Node.js
  if (!isPlatformBrowser(platformId)) {
    return true; // Allow login page to render on the server
  }

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  console.log('authLoginGuard — token:', token);
  console.log('authLoginGuard — isLoggedIn:', auth.isLoggedIn);

  if (auth.isLoggedIn) {
    console.log('Already logged in, redirecting to dashboard');
    router.navigate(['/dashboard']);
    return false;
  }

  console.log('Not logged in, allowing login page');
  return true;
};
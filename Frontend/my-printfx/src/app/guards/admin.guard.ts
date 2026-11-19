import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// Lets only admins open admin pages (Add Company, Add Product, Pending Signups).
// This only hides pages in the browser; the backend separately blocks
// non-admins from actually adding or changing anything.
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const isAdmin = typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true';
  return isAdmin ? true : router.createUrlTree(['/dashboard']);
};
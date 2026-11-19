import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../service/auth.service";
import { inject } from "@angular/core";

// auth.guard.ts
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn) {
    router.navigate(['/login']);
    return false;        // block dashboard if not logged in
  }
  return true;           // allow dashboard if logged in
};
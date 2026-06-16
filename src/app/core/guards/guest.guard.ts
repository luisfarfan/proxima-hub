import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthTokenStorage } from '../auth/auth-token.storage';

export const guestGuard: CanActivateFn = () => {
  const tokens = inject(AuthTokenStorage);
  const router = inject(Router);
  if (tokens.hasAccessToken()) {
    return router.parseUrl('/');
  }
  return true;
};

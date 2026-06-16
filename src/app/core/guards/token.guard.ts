import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthTokenStorage } from '../auth/auth-token.storage';

/** Lightweight guard that only checks token presence (no /me call). */
export const tokenGuard: CanActivateFn = () => {
  const tokens = inject(AuthTokenStorage);
  const router = inject(Router);
  if (!tokens.hasAccessToken()) {
    return router.parseUrl('/login');
  }
  return true;
};

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AuthTokenStorage } from '../auth/auth-token.storage';

export const authGuard: CanActivateFn = () => {
  const tokens = inject(AuthTokenStorage);
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!tokens.hasAccessToken()) {
    return router.parseUrl('/login');
  }

  return auth.ensureUserLoaded().pipe(
    map(() => true),
    catchError(() => {
      auth.logout(false);
      return of(router.parseUrl('/login'));
    }),
  );
};

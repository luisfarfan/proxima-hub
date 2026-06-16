import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { IS_COOKIE_AUTH, AuthTokenStorage } from '../auth/auth-token.storage';
import { TokenRefreshService } from '../auth/token-refresh.service';
import { SKIP_AUTH_REFRESH } from './http-context.tokens';

function isAnonymousPath(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/refresh');
}

/**
 * Outermost interceptor: on 401, refresh once and retry the original request.
 * In cookie-auth mode (prod) the httpOnly cookie travels automatically via withCredentials.
 */
export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_AUTH_REFRESH) || isAnonymousPath(req.url)) {
    return next(req);
  }

  const refreshSvc = inject(TokenRefreshService);
  const tokens = inject(AuthTokenStorage);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }

      const canRefresh = IS_COOKIE_AUTH || !!tokens.getRefreshToken();
      if (!canRefresh) {
        return throwError(() => err);
      }

      return from(refreshSvc.refreshAccessToken()).pipe(
        switchMap(() =>
          next(req.clone({ context: req.context.set(SKIP_AUTH_REFRESH, true) })),
        ),
        catchError((refreshErr) => {
          tokens.clear();
          void router.navigateByUrl('/login');
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};

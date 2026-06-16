import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthTokenStorage } from '../auth/auth-token.storage';

function isAnonymousPath(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/social/');
}

export const authBearerInterceptor: HttpInterceptorFn = (req, next) => {
  if (isAnonymousPath(req.url)) {
    return next(req);
  }
  const access = inject(AuthTokenStorage).getAccessToken();
  if (!access) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${access}` } }));
};

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BusinessContextService } from '../auth/business-context.service';

function isAnonymousPath(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/reset-password') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/verify-email')
  );
}

export const businessHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  if (isAnonymousPath(req.url) || req.headers.has('X-Business-ID')) {
    return next(req);
  }
  const bid = inject(BusinessContextService).businessId();
  if (!bid) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { 'X-Business-ID': bid } }));
};

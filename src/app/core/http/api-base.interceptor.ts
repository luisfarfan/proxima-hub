import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { RuntimeConfigService } from '../config/runtime-config.service';

export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  if (
    req.url.startsWith('http://') ||
    req.url.startsWith('https://') ||
    req.url.startsWith('/i18n/') ||
    req.url.startsWith('/data/')
  ) {
    return next(req);
  }
  const runtime = inject(RuntimeConfigService).requireConfig();
  const path = req.url.replace(/^\/+/, '');
  const url = `${runtime.apiV1BaseUrl}/${path}`;
  // withCredentials: true sends/receives the HttpOnly cookie (ADR-013 SSO)
  return next(req.clone({ url, withCredentials: true }));
};

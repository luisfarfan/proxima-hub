import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { GlobalHttpLoadingService } from './global-http-loading.service';
import { SKIP_GLOBAL_LOADER } from '@luisfarfan/auth';

function shouldTrackGlobalLoading(url: string): boolean {
  if (url.includes('config.json')) return false;
  if (url.includes('/i18n/')) return false;
  if (url.startsWith('/data/')) return false;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url.includes('/api/v1/') || url.includes('/api/');
  }
  return url.startsWith('/');
}

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_GLOBAL_LOADER) || !shouldTrackGlobalLoading(req.url)) {
    return next(req);
  }
  const loading = inject(GlobalHttpLoadingService);
  loading.begin();
  return next(req).pipe(finalize(() => loading.end()));
};

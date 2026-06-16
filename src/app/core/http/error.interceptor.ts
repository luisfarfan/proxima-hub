import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { SUPPRESS_ERROR_TOAST } from './http-context.tokens';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (req.context.get(SUPPRESS_ERROR_TOAST)) {
        return throwError(() => error);
      }

      // Fase 0: logging mínimo. En Fase 1 se conecta MessageService de PrimeNG.
      if (error.status === 401) {
        console.warn('[proxima-hub] Session expired or unauthorized.');
      } else if (error.status >= 500) {
        console.error('[proxima-hub] Server error:', error.status, error.message);
      } else if (error.status !== 0) {
        console.warn('[proxima-hub] HTTP error:', error.status, error.url);
      }

      return throwError(() => error);
    }),
  );
};

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import { SUPPRESS_ERROR_TOAST } from '@luisfarfan/auth';

function toastMessage(error: HttpErrorResponse): string {
  if (error.status === 0) return 'No se pudo conectar. Verifica tu conexión a internet.';
  if (error.status === 403) return 'No tienes permiso para realizar esta acción.';
  if (error.status === 404) return 'El recurso solicitado no fue encontrado.';
  if (error.status >= 500) return 'Ocurrió un error en el servidor. Intenta de nuevo más tarde.';
  const detail = (error.error as Record<string, unknown> | null)?.['detail'];
  if (typeof detail === 'string') return detail;
  return 'Ocurrió un error inesperado.';
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (req.context.get(SUPPRESS_ERROR_TOAST)) {
        return throwError(() => error);
      }
      if (error.status === 401) {
        return throwError(() => error);
      }

      messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: toastMessage(error),
        life: 6000,
      });

      return throwError(() => error);
    }),
  );
};

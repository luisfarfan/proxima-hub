import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import { SUPPRESS_ERROR_TOAST } from '@luisfarfan/auth';

/**
 * PPR-106 — el `detail` crudo del backend llegaba al toast.
 *
 * Muchos `detail` están escritos para personas y en español; volcarlos es lo
 * correcto. Pero otros son códigos internos, y el comerciante terminaba leyendo
 * cosas como:
 *
 *   "PAYMENT_PROVIDER_SYNC_REQUIRED: Plan requires Mercado Pago sync
 *    (sync_targets including payment_provider) before subscription checkout"
 *
 * Un código interno tiene forma reconocible: MAYÚSCULAS con guion bajo al
 * principio, seguido de dos puntos o solo. Eso no se muestra nunca tal cual.
 */
const INTERNAL_CODE = /^[A-Z][A-Z0-9_]{3,}(?::|$)/;

/** Traducciones de los códigos que un comerciante puede llegar a encontrarse. */
const CODE_MESSAGES: Record<string, string> = {
  PAYMENT_PROVIDER_SYNC_REQUIRED:
    'Este plan todavía no se puede contratar en línea. Escríbenos y lo activamos contigo.',
};

/** Último recurso: dice qué pasó sin inventar una causa. */
const GENERIC = 'No se pudo completar la acción. Intenta de nuevo.';

function toastMessage(error: HttpErrorResponse): string {
  if (error.status === 0) return 'No se pudo conectar. Verifica tu conexión a internet.';
  if (error.status === 403) return 'No tienes permiso para realizar esta acción.';
  if (error.status === 404) return 'El recurso solicitado no fue encontrado.';
  if (error.status >= 500) return 'Ocurrió un error en el servidor. Intenta de nuevo más tarde.';

  const detail = (error.error as Record<string, unknown> | null)?.['detail'];
  if (typeof detail === 'string' && detail.trim()) {
    const text = detail.trim();
    if (INTERNAL_CODE.test(text)) {
      return CODE_MESSAGES[text.split(':')[0].trim()] ?? GENERIC;
    }
    return text;
  }

  // FastAPI manda una lista de errores de validación: nunca es texto de producto.
  if (Array.isArray(detail)) return GENERIC;

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

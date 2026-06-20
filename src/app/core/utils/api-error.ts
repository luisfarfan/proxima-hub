import { HttpErrorResponse } from '@angular/common/http';
import { isDomainError, isServerApiError, isValidationError } from '@luisfarfan/auth';

export function formatHttpError(err: unknown): string {
  if (!(err instanceof HttpErrorResponse)) {
    return err instanceof Error ? err.message : 'Error inesperado';
  }

  const body = err.error as unknown;

  if (isDomainError(body)) {
    return body.message;
  }

  if (isValidationError(body)) {
    return body.detail
      .map((d) => {
        const field = d.loc.length > 1 ? d.loc[d.loc.length - 1] : '';
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .join(', ');
  }

  if (isServerApiError(body)) {
    return body.detail;
  }

  return err.message || `HTTP ${err.status}`;
}

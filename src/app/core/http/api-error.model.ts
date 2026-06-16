import { HttpErrorResponse } from '@angular/common/http';

/** Error de dominio: regla de negocio violada. Tiene campo `code`. */
export interface DomainApiError {
  code: string;
  message: string;
  [key: string]: unknown;
}

/** Error de validación de input (Pydantic / FastAPI). `detail` es un array. */
export interface ValidationApiError {
  detail: Array<{ loc: string[]; msg: string; type: string }>;
}

/** Error inesperado del servidor. `detail` es un string. */
export interface ServerApiError {
  detail: string;
  request_id?: string;
}

export function isDomainError(body: unknown): body is DomainApiError {
  return (
    body !== null &&
    typeof body === 'object' &&
    'code' in body &&
    typeof (body as Record<string, unknown>)['code'] === 'string' &&
    (body as Record<string, unknown>)['code'] !== ''
  );
}

export function isValidationError(body: unknown): body is ValidationApiError {
  return (
    body !== null &&
    typeof body === 'object' &&
    'detail' in body &&
    Array.isArray((body as Record<string, unknown>)['detail'])
  );
}

export function isServerApiError(body: unknown): body is ServerApiError {
  return (
    body !== null &&
    typeof body === 'object' &&
    'detail' in body &&
    typeof (body as Record<string, unknown>)['detail'] === 'string' &&
    !('code' in body)
  );
}

export function extractErrorCode(err: unknown): string | null {
  if (!(err instanceof HttpErrorResponse)) return null;
  const body = err.error as unknown;
  return isDomainError(body) ? body.code : null;
}

export function extractTypedErrorCode<T extends string>(
  err: unknown,
  codes: readonly T[],
): T | null {
  const code = extractErrorCode(err);
  if (code === null) return null;
  return (codes as readonly string[]).includes(code) ? (code as T) : null;
}

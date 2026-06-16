import { HttpErrorResponse } from '@angular/common/http';
import { isDomainError } from '../http/api-error.model';

/** Maps auth error codes to Spanish error messages. */
const AUTH_CODE_MESSAGES: Record<string, string> = {
  RESET_TOKEN_INVALID: 'El enlace de restablecimiento no es válido.',
  RESET_TOKEN_EXPIRED: 'El enlace de restablecimiento ha expirado. Solicita uno nuevo.',
  VERIFY_TOKEN_INVALID: 'El enlace de verificación no es válido o ya fue usado.',
  EMAIL_ALREADY_VERIFIED: 'Este correo ya fue verificado.',
  EMAIL_NOT_VERIFIED: 'Debes verificar tu correo antes de continuar.',
};

function extractAuthCode(errorOrDetail: unknown): string | null {
  if (errorOrDetail instanceof HttpErrorResponse) {
    const body = errorOrDetail.error as unknown;
    if (isDomainError(body)) return body.code;
    const detail = (errorOrDetail.error as Record<string, unknown> | null)?.['detail'];
    return typeof detail === 'string' ? detail : null;
  }
  return typeof errorOrDetail === 'string' ? errorOrDetail : null;
}

export function isAuthDetailCode(errorOrDetail: unknown, code: string): boolean {
  return extractAuthCode(errorOrDetail) === code;
}

/** Returns a Spanish error message for known auth codes, or null for unknown errors. */
export function mapAuthDetailToMessageKey(errorOrDetail: unknown): string | null {
  const code = extractAuthCode(errorOrDetail);
  return code !== null ? (AUTH_CODE_MESSAGES[code] ?? null) : null;
}

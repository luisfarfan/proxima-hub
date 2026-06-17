export type {
  DomainApiError,
  ValidationApiError,
  ServerApiError,
} from '@proxima/auth';
export {
  isDomainError,
  isValidationError,
  isServerApiError,
  extractErrorCode,
  extractTypedErrorCode,
  SUPPRESS_ERROR_TOAST,
  SKIP_GLOBAL_LOADER,
  SKIP_AUTH_REFRESH,
} from '@proxima/auth';
export { formatHttpError } from '../utils/api-error';

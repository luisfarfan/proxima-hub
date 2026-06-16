import { HttpContextToken } from '@angular/common/http';

/** When true, error.interceptor skips global error toasts (guest auth pages handle errors inline). */
export const SUPPRESS_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

/** When true, loadingInterceptor does not increment the global HTTP activity indicator. */
export const SKIP_GLOBAL_LOADER = new HttpContextToken<boolean>(() => false);

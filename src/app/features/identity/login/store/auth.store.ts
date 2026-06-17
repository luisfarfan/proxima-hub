import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService, AuthTokenStorage, validateNextUrl } from '@proxima/auth';
import { RuntimeConfigService } from '../../../../core/config/runtime-config.service';
import { formatHttpError } from '../../../../core/utils/api-error';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly tokenStorage = inject(AuthTokenStorage);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async login(email: string, password: string, next?: string | null): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.auth.login(email, password));
      const memberships = this.auth.memberships();

      if (memberships.length === 1) {
        const biz = memberships[0];
        this.auth.businessContext.setBusinessId(biz.id);

        const config = this.runtimeConfig.requireConfig();
        const validatedNext = validateNextUrl(next, config);
        let redirectUrl = validatedNext ?? '/';

        if (redirectUrl.startsWith('http')) {
          const token = this.tokenStorage.getAccessToken();
          if (token) {
            const sep = redirectUrl.includes('?') ? '&' : '?';
            redirectUrl = `${redirectUrl}${sep}sso=${encodeURIComponent(token)}`;
            const refreshToken = this.tokenStorage.getRefreshToken();
            if (refreshToken) {
              redirectUrl += `&sso_refresh=${encodeURIComponent(refreshToken)}`;
            }
          }
        }
        window.location.href = redirectUrl;
      } else {
        const qs = next ? `?next=${encodeURIComponent(next)}` : '';
        await this.router.navigateByUrl(`/elegir-negocio${qs}`);
      }
    } catch (err) {
      this.error.set(
        err instanceof HttpErrorResponse && err.status === 401
          ? 'Correo o contraseña incorrectos.'
          : formatHttpError(err),
      );
    } finally {
      this.loading.set(false);
    }
  }

  async loginWithGoogle(credential: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.auth.loginWithGoogle(credential));
      const memberships = this.auth.memberships();

      if (memberships.length === 1) {
        const biz = memberships[0];
        this.auth.businessContext.setBusinessId(biz.id);

        const config = this.runtimeConfig.requireConfig();
        const validatedNext = validateNextUrl(null, config);
        let redirectUrl = validatedNext ?? '/';

        if (redirectUrl.startsWith('http')) {
          const token = this.tokenStorage.getAccessToken();
          if (token) {
            const sep = redirectUrl.includes('?') ? '&' : '?';
            redirectUrl = `${redirectUrl}${sep}sso=${encodeURIComponent(token)}`;
            const refreshToken = this.tokenStorage.getRefreshToken();
            if (refreshToken) {
              redirectUrl += `&sso_refresh=${encodeURIComponent(refreshToken)}`;
            }
          }
        }
        window.location.href = redirectUrl;
      } else {
        await this.router.navigateByUrl('/elegir-negocio');
      }
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 403) {
        this.error.set('Esta cuenta de Google no está registrada en Próxima.');
      } else {
        this.error.set(formatHttpError(err));
      }
    } finally {
      this.loading.set(false);
    }
  }

  clearError(): void {
    this.error.set(null);
  }
}

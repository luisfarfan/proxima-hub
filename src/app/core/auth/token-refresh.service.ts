import { HttpBackend, HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RuntimeConfigService } from '../config/runtime-config.service';
import type { TokenResponse } from '../models/token-response.model';
import { IS_COOKIE_AUTH, AuthTokenStorage } from './auth-token.storage';

/**
 * Refreshes tokens using HttpBackend so refresh calls bypass all interceptors.
 * Serializes concurrent calls so only one refresh is in-flight at a time.
 *
 * Prod (IS_COOKIE_AUTH): the refresh token is an httpOnly cookie sent automatically
 * via withCredentials. No query param needed.
 *
 * Dev (!IS_COOKIE_AUTH): the refresh token is in sessionStorage and sent as
 * ?refresh_token= because httpOnly cookies can't cross subdomains on localhost.
 */
@Injectable({ providedIn: 'root' })
export class TokenRefreshService {
  private readonly backend = inject(HttpBackend);
  private readonly bare = new HttpClient(this.backend);
  private readonly runtime = inject(RuntimeConfigService);
  private readonly tokens = inject(AuthTokenStorage);

  private inFlight: Promise<void> | null = null;

  refreshAccessToken(): Promise<void> {
    if (!this.inFlight) {
      this.inFlight = this.performRefresh().finally(() => {
        this.inFlight = null;
      });
    }
    return this.inFlight;
  }

  private async performRefresh(): Promise<void> {
    const { apiV1BaseUrl } = this.runtime.requireConfig();
    const url = `${apiV1BaseUrl}/auth/refresh`;

    if (IS_COOKIE_AUTH) {
      const res = await firstValueFrom(
        this.bare.post<TokenResponse>(url, {}, { withCredentials: true }),
      );
      this.tokens.saveTokens(res);
    } else {
      const refresh = this.tokens.getRefreshToken();
      if (!refresh) throw new Error('No refresh token available');
      const params = new HttpParams().set('refresh_token', refresh);
      const res = await firstValueFrom(
        this.bare.post<TokenResponse>(url, {}, { params, withCredentials: true }),
      );
      this.tokens.saveTokens(res);
    }
  }
}

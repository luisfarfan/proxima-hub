import { Injectable } from '@angular/core';
import type { TokenResponse } from '../models/token-response.model';

/**
 * True when running on a real proxima.pe domain (production/staging).
 * On those domains the refresh token lives in an httpOnly cookie managed by the
 * backend — JavaScript never reads or writes it.
 * On localhost/CI the refresh token is stored in sessionStorage and sent as a
 * query-param because httpOnly cookies cannot cross subdomains on localhost
 * without HTTPS + SameSite=None.
 */
export const IS_COOKIE_AUTH: boolean =
  typeof globalThis.location !== 'undefined' &&
  (globalThis.location.hostname === 'proxima.pe' ||
    globalThis.location.hostname.endsWith('.proxima.pe'));

const ACCESS = 'proxima_hub_access_token';
const REFRESH = 'proxima_hub_refresh_token';
const IS_SUPER_ADMIN = 'proxima_hub_is_super_admin';

@Injectable({ providedIn: 'root' })
export class AuthTokenStorage {
  private _accessToken: string | null = null;

  getAccessToken(): string | null {
    return IS_COOKIE_AUTH ? this._accessToken : sessionStorage.getItem(ACCESS);
  }

  getRefreshToken(): string | null {
    if (IS_COOKIE_AUTH) return null;
    return sessionStorage.getItem(REFRESH);
  }

  saveTokens(tokens: TokenResponse): void {
    if (IS_COOKIE_AUTH) {
      this._accessToken = tokens.access_token;
      if (tokens.is_super_admin !== undefined) {
        sessionStorage.setItem(IS_SUPER_ADMIN, tokens.is_super_admin ? 'true' : 'false');
      }
    } else {
      sessionStorage.setItem(ACCESS, tokens.access_token);
      if (tokens.refresh_token) {
        sessionStorage.setItem(REFRESH, tokens.refresh_token);
      }
      if (tokens.is_super_admin !== undefined) {
        sessionStorage.setItem(IS_SUPER_ADMIN, tokens.is_super_admin ? 'true' : 'false');
      }
    }
  }

  updateAccessToken(accessToken: string): void {
    if (IS_COOKIE_AUTH) {
      this._accessToken = accessToken;
    } else {
      sessionStorage.setItem(ACCESS, accessToken);
    }
  }

  clear(): void {
    this._accessToken = null;
    sessionStorage.removeItem(ACCESS);
    sessionStorage.removeItem(REFRESH);
    sessionStorage.removeItem(IS_SUPER_ADMIN);
  }

  hasAccessToken(): boolean {
    return !!this.getAccessToken();
  }

  getIsSuperAdmin(): boolean {
    return sessionStorage.getItem(IS_SUPER_ADMIN) === 'true';
  }
}

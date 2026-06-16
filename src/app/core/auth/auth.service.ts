import { HttpClient, HttpHeaders, HttpParams, HttpContext } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, map, of, shareReplay, switchMap, tap } from 'rxjs';
import type { HubUser, BusinessMembership } from '../models/user.model';
import type { TokenResponse } from '../models/token-response.model';
import { AuthTokenStorage } from './auth-token.storage';
import { BusinessContextService } from './business-context.service';
import { SUPPRESS_ERROR_TOAST } from '../http/http-context.tokens';

const guestAuthOptions = { context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true) };

/** Self-serve registration payload. `slug` and `plan_id` are derived server-side (FREE). */
export interface RegisterPayload {
  name: string;
  email: string;
  category?: string | null;
  country?: string;
  settings?: Record<string, unknown>;
  admin: {
    email: string;
    password: string;
    full_name: string;
  };
  captcha_token?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(AuthTokenStorage);
  public readonly businessContext = inject(BusinessContextService);

  private readonly userSignal = signal<HubUser | null>(null);
  private readonly membershipsSignal = signal<BusinessMembership[]>([]);
  private userLoad$: Observable<HubUser> | null = null;

  readonly user = this.userSignal.asReadonly();
  readonly memberships = this.membershipsSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.tokens.hasAccessToken());
  readonly isSuperAdmin = computed(() => {
    if (this.tokens.getIsSuperAdmin()) return true;
    const token = this.tokens.getAccessToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.kind === 'admin';
    } catch {
      return false;
    }
  });

  login(email: string, password: string): Observable<TokenResponse> {
    const body = new HttpParams().set('username', email.trim()).set('password', password);
    return this.http
      .post<TokenResponse>('auth/login', body.toString(), {
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      })
      .pipe(
        tap((t) => this.tokens.saveTokens(t)),
        tap(() => {
          this.userSignal.set(null);
          this.userLoad$ = null;
          this.businessContext.setBusinessId(null);
        }),
        switchMap((t) => this.getMemberships().pipe(map(() => t))),
      );
  }

  /** Step 2 of create-after-verify signup: verify the 6-digit code. */
  verifyRegistration(registrationId: string, code: string): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(
        'auth/register/verify',
        { registration_id: registrationId, code },
        guestAuthOptions,
      )
      .pipe(
        tap((t) => this.tokens.saveTokens(t)),
        tap(() => {
          this.userSignal.set(null);
          this.userLoad$ = null;
          this.businessContext.setBusinessId(null);
        }),
        switchMap((t) => this.getMemberships().pipe(map(() => t))),
      );
  }

  loginWithGoogle(credential: string): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>('auth/social/google', { token: credential }, guestAuthOptions)
      .pipe(
        tap((t) => this.tokens.saveTokens(t)),
        tap(() => {
          this.userSignal.set(null);
          this.userLoad$ = null;
          this.businessContext.setBusinessId(null);
        }),
        switchMap((t) => this.getMemberships().pipe(map(() => t))),
      );
  }

  linkGoogle(credential: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>('auth/social/link/google', { token: credential });
  }

  getMemberships(): Observable<BusinessMembership[]> {
    return this.http
      .get<BusinessMembership[]>('me/businesses')
      .pipe(tap((m) => this.membershipsSignal.set(m)));
  }

  ensureUserLoaded(): Observable<HubUser> {
    const existing = this.userSignal();
    if (existing) return of(existing);

    if (!this.userLoad$) {
      this.userLoad$ = this.http.get<HubUser>('me').pipe(
        tap((u) => {
          this.userSignal.set(u);
          this.businessContext.syncFromUser(u);
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
        finalize(() => {
          this.userLoad$ = null;
        }),
      );
    }

    return this.userLoad$;
  }

  logout(navigate = true): void {
    this.http.post('auth/logout', {}).subscribe({ error: () => {} });
    this.tokens.clear();
    this.userSignal.set(null);
    this.userLoad$ = null;
    this.membershipsSignal.set([]);
    this.businessContext.syncFromUser(null);
    if (navigate) {
      window.location.href = '/login';
    }
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      'auth/forgot-password',
      { email: email.trim().toLowerCase() },
      guestAuthOptions,
    );
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      'auth/reset-password',
      { token, new_password: newPassword },
      guestAuthOptions,
    );
  }

  verifyEmail(token: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('auth/verify-email', { token }, guestAuthOptions);
  }

  resendVerification(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('auth/resend-verification', {});
  }
}

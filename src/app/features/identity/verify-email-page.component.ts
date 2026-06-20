import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, mapAuthDetailToMessageKey } from '@luisfarfan/auth';
import { AuthGuestShellComponent } from './auth-guest-shell.component';
import { AuthInlineAlertComponent } from './auth-inline-alert.component';
import { AUTH_GUEST_BTN, AUTH_GUEST_LINK } from './auth-guest.styles';

type VerifyState = 'loading' | 'success' | 'error' | 'missing-token';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [
    RouterLink,
    ButtonModule,
    ProgressSpinnerModule,
    AuthGuestShellComponent,
    AuthInlineAlertComponent,
  ],
  templateUrl: './verify-email-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  readonly state = signal<VerifyState>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly linkClass = AUTH_GUEST_LINK;
  readonly btnClass = AUTH_GUEST_BTN;

  private token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
    if (!this.token) {
      this.state.set('missing-token');
      this.errorMessage.set('Falta el token de verificación.');
      return;
    }
    this.verify();
  }

  retry(): void {
    if (!this.token) return;
    this.state.set('loading');
    this.errorMessage.set(null);
    this.verify();
  }

  private verify(): void {
    this.auth.verifyEmail(this.token).subscribe({
      next: () => {
        this.state.set('success');
      },
      error: (err: HttpErrorResponse) => {
        this.state.set('error');
        const message = mapAuthDetailToMessageKey(err);
        this.errorMessage.set(message ?? 'El enlace de verificación no es válido o ya fue usado.');
      },
    });
  }
}

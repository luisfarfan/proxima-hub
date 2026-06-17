import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@proxima/auth';
import { RuntimeConfigService } from '../../core/config/runtime-config.service';

type LinkStatus = 'idle' | 'loading' | 'linked' | 'already_linked' | 'conflict' | 'error';

@Component({
  selector: 'app-google-link-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (googleClientId()) {
      <div class="flex flex-col gap-3">
        <div #googleLinkBtn></div>

        @switch (linkStatus()) {
          @case ('linked') {
            <p class="text-[0.8125rem] text-green-600">Tu cuenta de Google ha sido vinculada.</p>
          }
          @case ('already_linked') {
            <p class="text-[0.8125rem] text-muted-color">Esta cuenta de Google ya está vinculada.</p>
          }
          @case ('conflict') {
            <p class="text-[0.8125rem] text-red-600">Esta cuenta de Google ya está en uso por otro usuario.</p>
          }
          @case ('error') {
            <p class="text-[0.8125rem] text-red-600">Ocurrió un error inesperado. Intenta de nuevo.</p>
          }
        }
      </div>
    }
  `,
})
export class GoogleLinkSectionComponent {
  private readonly auth = inject(AuthService);
  private readonly ngZone = inject(NgZone);
  private readonly runtimeConfig = inject(RuntimeConfigService);

  readonly googleClientId = this.runtimeConfig.googleClientId;
  readonly linkStatus = signal<LinkStatus>('idle');
  readonly googleLinkBtnRef = viewChild<ElementRef<HTMLDivElement>>('googleLinkBtn');

  constructor() {
    afterNextRender(() => {
      const clientId = this.googleClientId();
      const btnEl = this.googleLinkBtnRef()?.nativeElement;
      if (!clientId || !btnEl || !window.google) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => {
          this.ngZone.run(() => this.linkAccount(credential));
        },
      });
      window.google.accounts.id.renderButton(btnEl, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
      });
    });
  }

  private async linkAccount(credential: string): Promise<void> {
    this.linkStatus.set('loading');
    try {
      const res = await firstValueFrom(this.auth.linkGoogle(credential));
      this.linkStatus.set(res.detail === 'ALREADY_LINKED' ? 'already_linked' : 'linked');
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        this.linkStatus.set('conflict');
      } else {
        this.linkStatus.set('error');
      }
    }
  }
}

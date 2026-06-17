import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { GoogleLinkSectionComponent } from '../../identity/google-link-section.component';

@Component({
  selector: 'app-cuenta-page',
  standalone: true,
  imports: [GoogleLinkSectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="page-root">
  <h1 class="page-h1">Mi cuenta</h1>

  <!-- Profile -->
  <section class="page-card" aria-labelledby="perfil-h">
    <h2 class="card-h2" id="perfil-h">Perfil</h2>
    <div class="user-row">
      <span class="user-avatar" aria-hidden="true">{{ userInitial() }}</span>
      <div class="user-info">
        <span class="user-name">{{ user()?.full_name ?? '—' }}</span>
        <span class="user-email">{{ user()?.email ?? '—' }}</span>
      </div>
    </div>
  </section>

  <!-- Change password -->
  <section class="page-card" aria-labelledby="pwd-h">
    <h2 class="card-h2" id="pwd-h">Contraseña</h2>
    <div class="field-group">
      <div class="field">
        <label class="field-label" for="current-pwd">Contraseña actual</label>
        <div class="pwd-wrap">
          <input
            [type]="showCurrent() ? 'text' : 'password'"
            id="current-pwd"
            class="field-input pwd-input"
            autocomplete="current-password"
            [value]="currentPwd()"
            (input)="currentPwd.set($any($event.target).value)"
          />
          <button
            type="button"
            class="pwd-toggle"
            (click)="showCurrent.set(!showCurrent())"
            [attr.aria-label]="showCurrent() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          ><i [class]="showCurrent() ? 'pi pi-eye-slash' : 'pi pi-eye'"></i></button>
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="new-pwd">Nueva contraseña</label>
        <div class="pwd-wrap">
          <input
            [type]="showNew() ? 'text' : 'password'"
            id="new-pwd"
            class="field-input pwd-input"
            autocomplete="new-password"
            [value]="newPwd()"
            (input)="newPwd.set($any($event.target).value)"
          />
          <button
            type="button"
            class="pwd-toggle"
            (click)="showNew.set(!showNew())"
            [attr.aria-label]="showNew() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          ><i [class]="showNew() ? 'pi pi-eye-slash' : 'pi pi-eye'"></i></button>
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="confirm-pwd">Confirmar contraseña</label>
        <div class="pwd-wrap">
          <input
            [type]="showConfirm() ? 'text' : 'password'"
            id="confirm-pwd"
            class="field-input pwd-input"
            autocomplete="new-password"
            [value]="confirmPwd()"
            (input)="confirmPwd.set($any($event.target).value)"
          />
          <button
            type="button"
            class="pwd-toggle"
            (click)="showConfirm.set(!showConfirm())"
            [attr.aria-label]="showConfirm() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          ><i [class]="showConfirm() ? 'pi pi-eye-slash' : 'pi pi-eye'"></i></button>
        </div>
      </div>
    </div>

    @if (pwdError(); as err) {
      <p class="field-error" role="alert">{{ err }}</p>
    }
    @if (pwdSuccess()) {
      <p class="field-success" role="status">Contraseña actualizada correctamente.</p>
    }

    <button
      class="btn-primary"
      type="button"
      [disabled]="saving()"
      (click)="changePassword()"
    >
      @if (saving()) { Guardando… } @else { Guardar contraseña }
    </button>
  </section>

  <!-- Google -->
  <section class="page-card" aria-labelledby="google-h">
    <h2 class="card-h2" id="google-h">Conexiones</h2>
    <app-google-link-section />
  </section>
</div>
  `,
  styles: [`
:host { display: block; }

.user-row {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.user-avatar {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  font-size: 1.0625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--ink);
}

.user-email {
  font-size: 0.8125rem;
  color: var(--muted);
}

.pwd-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.pwd-input {
  padding-right: 2.75rem !important;
}

.pwd-toggle {
  position: absolute;
  right: 0.65rem;
  background: none;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: var(--faint);
  display: flex;
  align-items: center;
  border-radius: 0.25rem;
  line-height: 1;
}

.pwd-toggle:hover { color: var(--ink); }

.pwd-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
  `],
})
export class CuentaPageComponent {
  protected readonly auth = inject(AuthService);
  protected readonly user = this.auth.user;

  protected readonly userInitial = computed(
    () => (this.user()?.full_name?.[0] ?? '?').toUpperCase(),
  );

  protected readonly currentPwd = signal('');
  protected readonly newPwd = signal('');
  protected readonly confirmPwd = signal('');
  protected readonly showCurrent = signal(false);
  protected readonly showNew = signal(false);
  protected readonly showConfirm = signal(false);
  protected readonly saving = signal(false);
  protected readonly pwdError = signal<string | null>(null);
  protected readonly pwdSuccess = signal(false);

  protected async changePassword(): Promise<void> {
    this.pwdError.set(null);
    this.pwdSuccess.set(false);

    if (!this.currentPwd()) {
      this.pwdError.set('Ingresa tu contraseña actual.');
      return;
    }
    if (this.newPwd().length < 8) {
      this.pwdError.set('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (this.newPwd() !== this.confirmPwd()) {
      this.pwdError.set('Las contraseñas no coinciden.');
      return;
    }

    this.saving.set(true);
    try {
      await firstValueFrom(this.auth.changePassword(this.currentPwd(), this.newPwd()));
      this.pwdSuccess.set(true);
      this.currentPwd.set('');
      this.newPwd.set('');
      this.confirmPwd.set('');
    } catch (err: unknown) {
      const detail = (err as { error?: { detail?: string } })?.error?.detail;
      this.pwdError.set(detail ?? 'Error al cambiar la contraseña. Intenta de nuevo.');
    } finally {
      this.saving.set(false);
    }
  }
}

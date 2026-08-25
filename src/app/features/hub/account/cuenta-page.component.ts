import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@luisfarfan/auth';

@Component({
  selector: 'app-cuenta-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="page-root">
  <h1 class="page-h1" id="perfil-h">Perfil</h1>

  <!-- Con la contraseña y las conexiones mudadas a «Acceso y seguridad», la
       página quedó de un solo tema: repetir «Perfil» dentro de la tarjeta era
       decirlo dos veces seguidas. -->
  <section class="page-card" aria-labelledby="perfil-h">
    <div class="user-row">
      <span class="user-avatar" aria-hidden="true">{{ userInitial() }}</span>
      <div class="user-info">
        <span class="user-name">{{ user()?.full_name ?? '—' }}</span>
        <span class="user-email">{{ user()?.email ?? '—' }}</span>
      </div>
    </div>
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
  `],
})
export class CuentaPageComponent {
  protected readonly auth = inject(AuthService);
  protected readonly user = this.auth.user;

  protected readonly userInitial = computed(
    () => (this.user()?.full_name?.[0] ?? '?').toUpperCase(),
  );

}

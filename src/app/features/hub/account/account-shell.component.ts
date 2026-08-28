import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, BusinessContextService } from '@luisfarfan/auth';

import { HubDataCacheService } from '../../../core/services/hub-data-cache.service';
import { resolveActiveBusinessName } from '../../../core/auth/active-business-name';

/**
 * El marco de la cuenta, en dos grupos con dueño.
 *
 * Antes eran cuatro pestañas planas —Cuenta, Plan, Seguridad, Equipo— que
 * mezclaban dos sujetos: las dos primeras son sobre la PERSONA (ninguna
 * menciona un negocio jamás) y las dos últimas sobre el NEGOCIO. Además
 * repetían exactamente los cuatro ítems del menú del avatar, en la misma
 * pantalla, y nada advertía que cambiar de negocio arriba cambia la mitad de
 * ellas y deja la otra mitad igual.
 */
@Component({
  selector: 'app-account-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './account-shell.component.html',
  styleUrl: './account-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountShellComponent {
  private readonly auth = inject(AuthService);
  private readonly businessCtx = inject(BusinessContextService);
  private readonly hubData = inject(HubDataCacheService);

  private readonly subRes = resource({
    loader: async () => this.hubData.getSubscriptionStatus(this.businessCtx.businessId()),
  });

  /** El nombre sale de las membresías, igual que en el encabezado del Hub. */
  private readonly memberships = computed(() => this.auth.memberships() ?? []);

  protected readonly businessName = computed(() => {
    const bizId = this.businessCtx.businessId();
    return resolveActiveBusinessName(this.memberships(), this.auth.user(), bizId);
  });

  protected readonly businessInitial = computed(() =>
    (this.businessName().charAt(0) || 'N').toUpperCase(),
  );

  /** El plan del negocio, para que el grupo diga de quién es lo que hay debajo. */
  protected readonly planName = computed(() => {
    const name = this.subRes.value()?.plan_name;
    if (!name) return this.subRes.isLoading() ? '' : 'Plan Gratis';
    return name.split('—')[0].trim();
  });

  protected readonly userName = computed(() => this.auth.user()?.full_name?.trim() || 'Tu cuenta');
  protected readonly userEmail = computed(() => this.auth.user()?.email ?? '');
  protected readonly userInitial = computed(() => (this.userName().charAt(0) || 'U').toUpperCase());
}

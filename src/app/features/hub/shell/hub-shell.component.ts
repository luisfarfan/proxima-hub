import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Menu } from 'primeng/menu';
import type { MenuItem } from 'primeng/api';
import { AuthService, BusinessContextService } from '@luisfarfan/auth';
import { RuntimeConfigService } from '../../../core/config/runtime-config.service';

@Component({
  selector: 'app-hub-shell',
  standalone: true,
  imports: [RouterLink, RouterOutlet, Menu],
  templateUrl: './hub-shell.component.html',
  styleUrl: './hub-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HubShellComponent {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  private readonly businessCtx = inject(BusinessContextService);
  private readonly runtimeConfig = inject(RuntimeConfigService);

  readonly appVersion = this.runtimeConfig.appVersion;

  protected readonly user = this.auth.user;
  protected readonly memberships = this.auth.memberships;

  protected readonly firstName = computed(() => {
    const n = this.user()?.full_name;
    return n ? n.split(' ')[0] : 'tú';
  });

  protected readonly userInitial = computed(
    () => (this.user()?.full_name?.[0] ?? '?').toUpperCase(),
  );

  protected readonly activeBusinessName = computed(() => {
    const bizId = this.businessCtx.businessId();
    return this.memberships().find((m) => m.id === bizId)?.name ?? 'Mi negocio';
  });

  protected readonly activeBusinessInitial = computed(
    () => this.activeBusinessName()[0]?.toUpperCase() ?? 'B',
  );

  protected readonly accountMenuItems: MenuItem[] = [
    {
      label: 'Mi cuenta',
      icon: 'pi pi-user',
      command: () => this.router.navigate(['/cuenta']),
    },
    {
      label: 'Plan',
      icon: 'pi pi-credit-card',
      command: () => this.router.navigate(['/plan']),
    },
    {
      label: 'Seguridad',
      icon: 'pi pi-lock',
      command: () => this.router.navigate(['/seguridad']),
    },
    {
      label: 'Equipo',
      icon: 'pi pi-users',
      command: () => this.router.navigate(['/equipo']),
    },
    { separator: true },
    {
      label: 'Cerrar sesión',
      icon: 'pi pi-sign-out',
      command: () => this.auth.logout(),
    },
  ];

  protected readonly accountMenuOpen = signal(false);

  protected switchBusiness(): void {
    this.router.navigate(['/elegir-negocio']);
  }

  protected toggleAccountMenu(menu: Menu, event: MouseEvent): void {
    menu.toggle(event);
  }
}

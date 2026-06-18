import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BusinessContextService } from '@proxima/auth';

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  role_id: string;
  status: 'active' | 'invited' | 'disabled';
  is_owner: boolean;
}

interface TeamRole {
  id: string;
  name: string;
}

interface UsageItem {
  resource: string;
  limit: number;
  current: number;
}

interface SubscriptionStatus {
  plan_name: string;
  status: string;
  usage: UsageItem[];
}

// Strips vendor suffixes (e.g. "Owner-proxima") and maps to readable Spanish labels.
function humanizeRole(slug: string): string {
  const key = slug
    .toLowerCase()
    .replace(/-proxima$/i, '')
    .replace(/[-_]/g, ' ')
    .trim();
  const MAP: Record<string, string> = {
    owner: 'Propietario',
    admin: 'Administrador',
    administrator: 'Administrador',
    manager: 'Gerente',
    staff: 'Empleado',
    employee: 'Empleado',
    viewer: 'Lector',
    cashier: 'Cajero',
    seller: 'Vendedor',
    sales: 'Ventas',
  };
  return MAP[key] ?? key.replace(/\b\w/g, (c) => c.toUpperCase());
}

@Component({
  selector: 'app-equipo-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="page-root">
  <h1 class="page-h1">Equipo</h1>

  @if (isFree()) {
    <!-- FREE plan: single user only -->
    <section class="page-card free-card" aria-labelledby="free-h">
      <div class="free-badge">Plan Gratis</div>
      <h2 class="card-h2" id="free-h">Solo tú en tu equipo</h2>
      <p class="free-desc">El plan Gratis incluye un solo usuario. Mejora tu plan para invitar miembros y colaborar en equipo.</p>
      <a routerLink="/plan" class="btn-primary">
        Mejora tu plan
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>
    </section>
  } @else {
    <!-- Members section -->
    <section class="page-card" aria-labelledby="members-h">
      <div class="card-head">
        <h2 class="card-h2" id="members-h">Miembros</h2>
        <button
          class="btn-invite-toggle"
          type="button"
          [attr.aria-expanded]="showInvite()"
          [disabled]="!canInvite()"
          (click)="showInvite.set(!showInvite())"
        >
          {{ showInvite() ? 'Cancelar' : '+ Invitar' }}
        </button>
      </div>

      @if (!canInvite()) {
        <p class="invite-limit-note" role="note">
          Mejora tu plan para invitar a tu equipo.
          <a routerLink="/plan" class="upgrade-link">Ver planes →</a>
        </p>
      }

      @if (showInvite() && canInvite()) {
        <div class="invite-form" role="region" aria-label="Formulario de invitación">
          <div class="field">
            <label class="field-label" for="invite-email">Correo electrónico</label>
            <input
              id="invite-email"
              type="email"
              class="field-input"
              placeholder="usuario@ejemplo.com"
              [value]="inviteEmail()"
              (input)="inviteEmail.set($any($event.target).value)"
              autocomplete="email"
              [attr.aria-describedby]="inviteError() ? 'invite-email-err' : null"
              [attr.aria-invalid]="inviteError() ? 'true' : null"
            />
          </div>
          @if (roles().length > 0) {
            <div class="field">
              <label class="field-label" for="invite-role">Rol</label>
              <select
                id="invite-role"
                class="field-select"
                [value]="inviteRoleId()"
                (change)="inviteRoleId.set($any($event.target).value)"
              >
                <option value="" disabled>Selecciona un rol</option>
                @for (r of roles(); track r.id) {
                  <option [value]="r.id">{{ humanizeRole(r.name) }}</option>
                }
              </select>
            </div>
          }
          @if (inviteError(); as err) {
            <p id="invite-email-err" class="field-error" role="alert">{{ err }}</p>
          }
          @if (inviteSuccess()) {
            <p class="field-success" role="status">Invitación enviada correctamente.</p>
          }
          <button
            class="btn-primary"
            type="button"
            [disabled]="inviting()"
            (click)="invite()"
          >
            {{ inviting() ? 'Enviando…' : 'Enviar invitación' }}
          </button>
        </div>
      }

      @if (membersLoading()) {
        <div class="skeleton" role="status" aria-label="Cargando miembros"></div>
      } @else if (members(); as list) {
        @if (list.length === 0) {
          <p class="empty-msg" style="margin:0">No hay miembros en el equipo.</p>
        } @else {
          <ul class="members-list" role="list">
            @for (m of list; track m.id) {
              <li class="member-row" role="listitem">
                <span class="member-avatar" aria-hidden="true">{{ (m.full_name || m.email)[0].toUpperCase() }}</span>
                <div class="member-info">
                  <span class="member-name">{{ m.full_name || m.email }}</span>
                  @if (m.full_name) {
                    <span class="member-email">{{ m.email }}</span>
                  }
                </div>
                @if (m.status === 'invited') {
                  <span class="member-status-badge">Invitado</span>
                }
                @if (m.is_owner) {
                  <span class="owner-badge">Propietario</span>
                } @else if (roles().length > 0) {
                  <select
                    class="role-select"
                    [value]="m.role_id || m.role"
                    [disabled]="changingRoleId() === m.id"
                    (change)="changeRole(m.id, $any($event.target).value)"
                    [attr.aria-label]="'Rol de ' + (m.full_name || m.email)"
                  >
                    @for (r of roles(); track r.id) {
                      <option [value]="r.id">{{ humanizeRole(r.name) }}</option>
                    }
                  </select>
                } @else {
                  <span class="member-role">{{ humanizeRole(m.role) }}</span>
                }
              </li>
            }
          </ul>
        }
      } @else {
        <!-- CORS gap -->
        <div class="empty-state">
          <p class="empty-msg">No se pudo cargar el equipo.</p>
          <p class="empty-hint">Disponible cuando el servidor permita solicitudes desde este origen.</p>
        </div>
      }
    </section>
  }
</div>
  `,
  styles: [`
:host { display: block; }

.free-card { text-align: left; }

.free-badge {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 999px;
  background: #f1f0ec;
  color: var(--muted);
  margin-bottom: 0.75rem;
}

.free-desc {
  font-size: 0.875rem;
  color: var(--muted);
  margin: 0.25rem 0 1.25rem;
  line-height: 1.55;
}

/* btn-primary on <a> needs text-decoration reset */
a.btn-primary {
  text-decoration: none;
}

.btn-invite-toggle {
  height: 2rem;
  padding: 0 0.875rem;
  background: transparent;
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  white-space: nowrap;
}

.btn-invite-toggle:hover:not([disabled]) {
  background: rgba(0, 9, 220, 0.05);
}

.btn-invite-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.btn-invite-toggle[disabled] {
  opacity: 0.45;
  cursor: not-allowed;
  border-color: var(--line);
  color: var(--muted);
}

.invite-limit-note {
  font-size: 0.8125rem;
  color: var(--faint);
  margin: 0.2rem 0 0.75rem;
  line-height: 1.5;
}

.upgrade-link {
  color: var(--accent);
  font-weight: 500;
  text-decoration: none;
}

.upgrade-link:hover { text-decoration: underline; }

.upgrade-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 2px;
}

.invite-form {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1.1rem;
  background: #f9f8f6;
  border-radius: 0.625rem;
  margin-bottom: 1.25rem;
  border: 1px solid var(--line-soft);
}

.members-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}

.member-row {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--line-soft);
}

.member-row:last-child { border-bottom: none; }

.member-avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: #f1f0ec;
  color: var(--ink);
  font-size: 0.875rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.member-name {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-email {
  font-size: 0.75rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-role {
  font-size: 0.8125rem;
  color: var(--muted);
  flex-shrink: 0;
}

.owner-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
  background: #ede9fe;
  color: #6d28d9;
  flex-shrink: 0;
}

.member-status-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fef3c7;
  color: #92400e;
  flex-shrink: 0;
}

.role-select {
  height: 2rem;
  padding: 0 0.5rem;
  border: 1px solid var(--line);
  border-radius: 0.4rem;
  font-size: 0.8125rem;
  color: var(--ink);
  background: #fff;
  cursor: pointer;
  font-family: inherit;
  flex-shrink: 0;
}

.role-select:focus { outline: 2px solid var(--accent); outline-offset: 2px; }
.role-select[disabled] { opacity: 0.6; cursor: not-allowed; }
  `],
})
export class EquipoPageComponent {
  private readonly http = inject(HttpClient);
  private readonly businessCtx = inject(BusinessContextService);

  private readonly membersRes = resource({
    loader: async () => {
      if (!this.businessCtx.businessId()) return null;
      try {
        return await firstValueFrom(this.http.get<TeamMember[]>('admin/team/members'));
      } catch {
        return null;
      }
    },
  });

  private readonly rolesRes = resource({
    loader: async () => {
      if (!this.businessCtx.businessId()) return [];
      try {
        return await firstValueFrom(this.http.get<TeamRole[]>('admin/team/roles'));
      } catch {
        return [];
      }
    },
  });

  // Subscription: used to detect FREE plan (max_users ≤ 1) and invite capacity.
  private readonly subRes = resource({
    loader: async () => {
      if (!this.businessCtx.businessId()) return null;
      try {
        return await firstValueFrom(
          this.http.get<SubscriptionStatus>('admin/billing/subscription/status'),
        );
      } catch {
        return null;
      }
    },
  });

  private readonly maxUsersQuota = computed(() => {
    const usage = this.subRes.value()?.usage ?? [];
    return (
      usage.find((u) => u.resource === 'max_users' || u.resource === 'users') ?? null
    );
  });

  protected readonly membersLoading = this.membersRes.isLoading;
  protected readonly members = computed(() => this.membersRes.value() ?? null);
  protected readonly roles = computed(() => this.rolesRes.value() ?? []);

  // FREE when subscription data confirms max_users ≤ 1. Defaults false (CORS gap).
  protected readonly isFree = computed(() => {
    const q = this.maxUsersQuota();
    return q !== null && q.limit <= 1;
  });

  // Can invite when below capacity. Defaults true when subscription unavailable.
  protected readonly canInvite = computed(() => {
    const q = this.maxUsersQuota();
    if (q === null) return true;
    if (q.limit === 0) return true; // unlimited
    return q.current < q.limit;
  });

  protected readonly humanizeRole = humanizeRole;

  protected readonly showInvite = signal(false);
  protected readonly inviteEmail = signal('');
  protected readonly inviteRoleId = signal('');
  protected readonly inviting = signal(false);
  protected readonly inviteError = signal<string | null>(null);
  protected readonly inviteSuccess = signal(false);
  protected readonly changingRoleId = signal<string | null>(null);

  protected async invite(): Promise<void> {
    this.inviteError.set(null);
    this.inviteSuccess.set(false);

    const email = this.inviteEmail().trim();
    if (!email || !email.includes('@')) {
      this.inviteError.set('Ingresa un correo electrónico válido.');
      return;
    }
    if (!this.inviteRoleId() && this.roles().length > 0) {
      this.inviteError.set('Selecciona un rol.');
      return;
    }

    this.inviting.set(true);
    try {
      const payload: Record<string, string> = { email };
      if (this.inviteRoleId()) payload['role_id'] = this.inviteRoleId();
      await firstValueFrom(this.http.post('admin/team/members', payload));
      this.inviteSuccess.set(true);
      this.inviteEmail.set('');
      this.inviteRoleId.set('');
    } catch (err: unknown) {
      const detail = (err as { error?: { detail?: string } })?.error?.detail;
      this.inviteError.set(detail ?? 'Error al enviar la invitación.');
    } finally {
      this.inviting.set(false);
    }
  }

  protected async changeRole(memberId: string, roleId: string): Promise<void> {
    this.changingRoleId.set(memberId);
    try {
      await firstValueFrom(
        this.http.patch(`admin/team/members/${memberId}`, { role_id: roleId }),
      );
    } catch {
      // ignore — select reverts on next render
    } finally {
      this.changingRoleId.set(null);
    }
  }
}

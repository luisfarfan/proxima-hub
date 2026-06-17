import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface Session {
  id: string;
  user_agent: string;
  ip_address: string;
  last_seen_at: string;
  created_at: string;
  is_active: boolean;
}

function parseDevice(ua: string): string {
  if (/mobile|android|iphone|ipad/i.test(ua)) return 'Móvil';
  if (/windows nt/i.test(ua)) return 'Windows';
  if (/mac os x/i.test(ua)) return 'Mac';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Navegador';
}

function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\//i.test(ua)) return 'Opera';
  if (/chrome\/\d/i.test(ua)) return 'Chrome';
  if (/firefox\/\d/i.test(ua)) return 'Firefox';
  if (/safari\//i.test(ua)) return 'Safari';
  return 'Navegador';
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

@Component({
  selector: 'app-seguridad-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="page-root">
  <h1 class="page-h1">Seguridad</h1>

  <section class="page-card" aria-labelledby="sessions-h">
    <div class="card-head">
      <h2 class="card-h2" id="sessions-h">Sesiones activas</h2>
      @if (!loading() && (visibleSessions()?.length ?? 0) > 1) {
        <button
          class="btn-danger-sm"
          type="button"
          [disabled]="revoking()"
          (click)="revokeOthers()"
          [attr.aria-label]="revokingId() === 'all'
            ? 'Confirmar: cerrar todas las demás sesiones'
            : 'Cerrar las demás sesiones'"
        >
          {{ revokingId() === 'all' ? '¿Confirmar?' : 'Cerrar las demás' }}
        </button>
      }
    </div>

    @if (loading()) {
      <div class="skeleton" role="status" aria-label="Cargando sesiones"></div>
    } @else if (visibleSessions(); as sessions) {
      @if (sessions.length === 0) {
        <p class="empty-msg" style="margin:0">No hay sesiones activas.</p>
      } @else {
        <ul class="sessions-list" role="list">
          @for (s of sessions; track s.id) {
            <li class="session-row" role="listitem">
              <span class="session-icon" aria-hidden="true">
                <i [class]="isMobile(s.user_agent) ? 'pi pi-mobile' : 'pi pi-desktop'"></i>
              </span>
              <div class="session-info">
                <span class="session-device">{{ parseDevice(s.user_agent) }} · {{ parseBrowser(s.user_agent) }}</span>
                <span class="session-meta">{{ s.ip_address }} · {{ formatDate(s.last_seen_at) }}</span>
              </div>
              @if (s.is_active) {
                <span class="session-chip">Esta sesión</span>
              } @else {
                <button
                  class="btn-revoke"
                  type="button"
                  [disabled]="revoking()"
                  (click)="revokeSession(s.id)"
                  [attr.aria-label]="revokingId() === s.id
                    ? 'Confirmar revocar sesión'
                    : 'Revocar sesión de ' + parseDevice(s.user_agent)"
                >
                  {{ revokingId() === s.id ? '¿Confirmar?' : 'Revocar' }}
                </button>
              }
            </li>
          }
        </ul>
      }
    } @else {
      <div class="empty-state">
        <p class="empty-msg">No se pudieron cargar las sesiones.</p>
        <p class="empty-hint">Disponible cuando el servidor permita solicitudes desde este origen.</p>
      </div>
    }
  </section>
</div>
  `,
  styles: [`
:host { display: block; }

.sessions-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}

.session-row {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--line-soft);
}

.session-row:last-child {
  border-bottom: none;
}

.session-icon {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: #f1f0ec;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  flex-shrink: 0;
  font-size: 1rem;
}

.session-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.session-device {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ink);
}

.session-meta {
  font-size: 0.75rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-chip {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
  background: #dcfce7;
  color: #15803d;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-revoke {
  height: 2rem;
  padding: 0 0.875rem;
  background: transparent;
  color: #b91c1c;
  border: 1px solid rgba(185, 28, 28, 0.3);
  border-radius: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-revoke:hover:not([disabled]) {
  background: rgba(185, 28, 28, 0.04);
  border-color: rgba(185, 28, 28, 0.6);
}

.btn-revoke:focus-visible {
  outline: 2px solid #b91c1c;
  outline-offset: 2px;
}

.btn-revoke[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
  `],
})
export class SeguridadPageComponent {
  private readonly http = inject(HttpClient);

  private readonly sessionsRes = resource({
    loader: async () => {
      try {
        return await firstValueFrom(this.http.get<Session[]>('me/sessions'));
      } catch {
        return null;
      }
    },
  });

  protected readonly loading = this.sessionsRes.isLoading;
  protected readonly revokingId = signal<string | null>(null);
  protected readonly revoking = signal(false);
  protected readonly removedIds = signal<string[]>([]);

  protected readonly visibleSessions = computed(() => {
    const list = this.sessionsRes.value();
    if (list === undefined || list === null) return list ?? null;
    const removed = this.removedIds();
    return list.filter((s) => !removed.includes(s.id));
  });

  protected readonly parseDevice = parseDevice;
  protected readonly parseBrowser = parseBrowser;
  protected readonly formatDate = formatDate;

  protected isMobile(ua: string): boolean {
    return /mobile|android|iphone|ipad/i.test(ua);
  }

  protected async revokeSession(id: string): Promise<void> {
    if (this.revokingId() !== id) {
      this.revokingId.set(id);
      return;
    }
    this.revoking.set(true);
    try {
      await firstValueFrom(this.http.delete(`me/sessions/${id}`));
      this.removedIds.update((ids) => [...ids, id]);
    } catch {
      // ignore — session stays visible on failure
    } finally {
      this.revoking.set(false);
      this.revokingId.set(null);
    }
  }

  protected async revokeOthers(): Promise<void> {
    if (this.revokingId() !== 'all') {
      this.revokingId.set('all');
      return;
    }
    this.revoking.set(true);
    try {
      await firstValueFrom(
        this.http.delete('me/sessions', { params: { except_current: 'true' } }),
      );
      const sessions = this.sessionsRes.value();
      if (sessions) {
        const inactiveIds = sessions.filter((s) => !s.is_active).map((s) => s.id);
        this.removedIds.update((ids) => [...new Set([...ids, ...inactiveIds])]);
      }
    } catch {
      // ignore
    } finally {
      this.revoking.set(false);
      this.revokingId.set(null);
    }
  }
}

import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Message } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { AuthService, AuthTokenStorage, BusinessContextService, validateNextUrl, type BusinessMembership } from '@luisfarfan/auth';
import { RuntimeConfigService } from '../../../core/config/runtime-config.service';
import { HubDataCacheService, type MerchantSummary } from '../../../core/services/hub-data-cache.service';
import { shortPlanName } from '../../../core/billing/plan-name';
import { LogoutService } from '../../../core/auth/logout.service';

@Component({
  selector: 'app-select-business-page',
  imports: [Message, ButtonModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-canvas px-4 py-10 sm:px-6">
      <div
        class="w-full rounded-xl bg-surface-0 p-6 border border-hairline sm:p-8"
        [style.max-width]="anchoDeOperador() ? '62.5rem' : '27.5rem'"
      >
        <main id="select-business-main" tabindex="-1" aria-labelledby="select-business-title">
          <header class="mb-7 text-center">
            <div
              class="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-[0.9375rem] font-semibold tracking-tight text-primary-contrast"
              aria-hidden="true"
            >
              P
            </div>
            <h1
              id="select-business-title"
              class="text-[1.125rem] font-semibold tracking-tight text-color sm:text-[1.25rem]"
              style="font-family: var(--font-heading)"
            >
              @if (isSuperAdmin()) { Administración de plataforma } @else { Elige tu negocio }
            </h1>
            <p class="mt-1.5 text-[0.8125rem] text-muted-color">
              @if (isSuperAdmin()) {
                Entra al panel global, o a un comercio para darle soporte
              } @else {
                Selecciona el negocio al que quieres acceder
              }
            </p>
          </header>

          @if (isSuperAdmin()) {
            <div class="mb-5">
              <button
                type="button"
                data-testid="go-to-platform"
                (click)="goToPlatform()"
                class="group flex w-full items-center gap-3 rounded-lg border border-hairline bg-surface-50 px-4 py-3 text-left transition-all duration-200 hover:border-primary/30 hover:bg-primary/5"
              >
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-200 text-muted-color transition-colors duration-200 group-hover:bg-primary/10 group-hover:text-primary"
                  aria-hidden="true"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
                  </svg>
                </div>
                <div class="flex min-w-0 flex-1 flex-col">
                  <span class="text-[0.8125rem] font-medium text-color transition-colors duration-200 group-hover:text-primary">
                    Acceder a Platform
                  </span>
                  <span class="text-[0.75rem] text-muted-color">Panel de control global</span>
                </div>
                <svg
                  class="ml-auto h-3.5 w-3.5 shrink-0 text-muted-color opacity-0 transition-all duration-200 group-hover:opacity-100"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          }

          @if (loading()) {
            <div role="status" aria-live="polite" class="flex flex-col items-center justify-center gap-3 py-10">
              <div
                class="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-primary"
                aria-hidden="true"
              ></div>
              <span class="text-[0.8125rem] text-muted-color">Cargando negocios…</span>
            </div>
          } @else {
            @if (loadError()) {
              <p-message severity="error" [text]="loadError()!" styleClass="mb-5 w-full" />
              <p-button
                type="button"
                label="Reintentar"
                styleClass="w-full h-9 rounded-md text-[0.8125rem] font-semibold"
                (onClick)="loadBusinesses()"
              />
            } @else {
              @if (isSuperAdmin() && businesses().length > 0) {
                <p class="mb-1 text-[0.6875rem] font-medium uppercase tracking-widest text-muted-color">
                  Comercios del ecosistema
                </p>
                <p class="mb-3 text-[0.75rem] text-muted-color">
                  Entrar a uno es un acceso de soporte, no un negocio tuyo.
                </p>
                @if (isSuperAdmin()) {
                  <input
                    type="search"
                    data-testid="select-business-filter"
                    class="mb-3 w-full rounded-md border border-hairline bg-surface-50 px-3 py-2 text-[0.8125rem] text-color"
                    placeholder="Buscar por nombre, slug o dominio…"
                    aria-label="Buscar comercio"
                    [value]="filter()"
                    (input)="filter.set($any($event.target).value)"
                  />
                }
              }

              @if (anchoDeOperador()) {
                <!-- Consola de operador: una fila por comercio, con lo que hace
                     falta para decidir a cuál entrar. -->
                <div class="overflow-hidden rounded-lg border border-hairline">
                  <div class="grid grid-cols-[minmax(0,2.4fr)_6.25rem_minmax(0,1.6fr)_minmax(0,1.2fr)_6rem_1.25rem] items-center gap-4 border-b border-hairline bg-surface-50 px-4 py-2.5">
                    <span class="text-[0.65625rem] font-semibold uppercase tracking-[0.09em] text-muted-color">Comercio</span>
                    <span class="text-[0.65625rem] font-semibold uppercase tracking-[0.09em] text-muted-color">Plan</span>
                    <span class="text-[0.65625rem] font-semibold uppercase tracking-[0.09em] text-muted-color">Tienda</span>
                    <span class="text-[0.65625rem] font-semibold uppercase tracking-[0.09em] text-muted-color">Últimos 30 días</span>
                    <span class="text-[0.65625rem] font-semibold uppercase tracking-[0.09em] text-muted-color">Alta</span>
                    <span></span>
                  </div>

                  @for (biz of visibleBusinesses(); track biz.id; let first = $first) {
                    <div
                      class="group relative grid grid-cols-[minmax(0,2.4fr)_6.25rem_minmax(0,1.6fr)_minmax(0,1.2fr)_6rem_1.25rem] items-center gap-4 bg-surface-0 px-4 py-3 transition-colors duration-150 hover:bg-surface-100 focus-within:bg-surface-100"
                      [class.border-t]="!first"
                      [class.border-hairline]="!first"
                    >
                      <!-- El botón estirado hace clicable toda la fila sin
                           envolver el enlace de la tienda, que sería HTML
                           inválido y dos clicks peleándose. -->
                      <button
                        type="button"
                        [attr.data-testid]="'select-business-' + biz.slug"
                        [attr.aria-label]="'Entrar a ' + biz.name"
                        (click)="select(biz)"
                        class="absolute inset-0 h-full w-full cursor-pointer border-0 bg-transparent p-0"
                      ></button>

                      <span class="pointer-events-none flex min-w-0 items-center gap-3">
                        <span
                          class="flex h-[2.125rem] w-[2.125rem] shrink-0 items-center justify-center rounded-md bg-primary/10 text-[0.8125rem] font-semibold text-primary"
                          aria-hidden="true"
                        >{{ biz.name.charAt(0).toUpperCase() }}</span>
                        <span class="flex min-w-0 flex-col gap-px">
                          <span class="truncate text-[0.84375rem] font-medium tracking-tight text-color">{{ biz.name }}</span>
                          <span class="truncate text-[0.75rem] text-muted-color">&#64;{{ biz.slug }}</span>
                        </span>
                      </span>

                      @if (fichaDe(biz); as ficha) {
                        <span
                          class="pointer-events-none inline-flex h-[1.375rem] items-center justify-self-start whitespace-nowrap rounded-full px-2.5 text-[0.71875rem] font-semibold"
                          [class.bg-primary\/10]="!!ficha.plan_name"
                          [class.text-primary]="!!ficha.plan_name"
                          [class.text-muted-color]="!ficha.plan_name"
                        >{{ planCorto(ficha) }}</span>

                        <span class="flex min-w-0 items-center gap-2">
                          <span
                            class="pointer-events-none h-[0.4375rem] w-[0.4375rem] shrink-0 rounded-full"
                            [style.background]="estadoWeb(ficha).tono === 'ok' ? '#27a644' : estadoWeb(ficha).tono === 'draft' ? '#8a6d1f' : '#d0d3da'"
                            aria-hidden="true"
                          ></span>
                          <span class="flex min-w-0 flex-col gap-px">
                            <span class="pointer-events-none whitespace-nowrap text-[0.78125rem] text-color">{{ estadoWeb(ficha).texto }}</span>
                            @if (urlWeb(ficha); as href) {
                              <a
                                [href]="href"
                                target="_blank"
                                rel="noopener noreferrer"
                                [attr.aria-label]="'Abrir la tienda de ' + biz.name + ' en una pestaña nueva'"
                                class="relative z-10 inline-flex max-w-full items-center gap-1 self-start text-[0.71875rem] text-muted-color hover:text-primary hover:underline"
                              >
                                <span class="truncate">{{ ficha.website_domain }}</span>
                                <svg class="h-2.5 w-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                  <path d="M14 4h6v6M20 4l-8.5 8.5" />
                                  <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                                </svg>
                              </a>
                            } @else {
                              <span class="pointer-events-none text-[0.71875rem] text-muted-color">—</span>
                            }
                          </span>
                        </span>

                        <span class="pointer-events-none flex min-w-0 flex-col gap-px">
                          <span class="whitespace-nowrap text-[0.78125rem] font-medium" [class.text-color]="ficha.order_count_30d > 0" [class.text-muted-color]="ficha.order_count_30d === 0">{{ actividad(ficha) }}</span>
                          <span class="whitespace-nowrap text-[0.71875rem] text-muted-color">{{ facturado(ficha) }}</span>
                        </span>

                        <span class="pointer-events-none whitespace-nowrap text-[0.78125rem] text-muted-color">{{ antiguedad(ficha) }}</span>
                      } @else {
                        <!-- Sin ficha no se inventan columnas: quedan vacías. -->
                        <span class="pointer-events-none text-[0.78125rem] text-muted-color">—</span>
                        <span class="pointer-events-none text-[0.78125rem] text-muted-color">—</span>
                        <span class="pointer-events-none text-[0.78125rem] text-muted-color">—</span>
                        <span class="pointer-events-none text-[0.78125rem] text-muted-color">—</span>
                      }

                      <span class="pointer-events-none flex justify-end text-primary opacity-0 transition-opacity duration-150 group-hover:opacity-100" aria-hidden="true">
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                      </span>
                    </div>
                  }
                </div>
              } @else {
                <ul class="m-0 flex list-none flex-col gap-2 p-0" role="list" aria-label="Negocios">
                  @for (biz of visibleBusinesses(); track biz.id) {
                    <li class="m-0 list-none p-0">
                      <button
                        type="button"
                        [attr.data-testid]="'select-business-' + biz.slug"
                        [attr.aria-label]="'Entrar a ' + biz.name"
                        (click)="select(biz)"
                        class="group flex w-full items-center gap-3.5 rounded-lg bg-surface-100 p-3.5 text-left border border-hairline transition-all duration-200 hover:bg-surface-100"
                      >
                        <div
                          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[0.8125rem] font-semibold text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-contrast"
                          aria-hidden="true"
                        >
                          {{ biz.name.charAt(0).toUpperCase() }}
                        </div>
                        <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
                          <span
                            class="truncate text-[0.8125rem] font-medium tracking-tight text-color transition-colors duration-200 group-hover:text-primary"
                          >{{ biz.name }}</span>
                          <span class="truncate text-[0.75rem] text-muted-color">&#64;{{ biz.slug }}</span>
                        </div>
                        <svg
                          class="ml-auto h-3.5 w-3.5 shrink-0 text-muted-color opacity-0 transition-all duration-200 group-hover:opacity-100"
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    </li>
                  }
                </ul>
              }

              @if (businesses().length > 0 && visibleBusinesses().length === 0) {
                <p class="py-6 text-center text-[0.8125rem] text-muted-color">
                  Ningún comercio coincide con «{{ filter() }}».
                </p>
              }

              @if (businesses().length === 0) {
                <div class="flex flex-col items-center py-6 text-center">
                  <svg
                    class="mb-3 h-8 w-8 text-orange-500/80"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <p class="text-[0.8125rem] text-muted-color">
                    @if (isSuperAdmin()) {
                      Todavía no hay comercios en el ecosistema.
                    } @else {
                      No tienes negocios asociados.
                    }
                  </p>
                  <button
                    type="button"
                    class="mt-3 text-[0.75rem] font-medium text-primary transition-colors duration-200 hover:underline"
                    (click)="logout()"
                  >
                    Cerrar sesión
                  </button>
                </div>
              }
            }
          }


          <footer class="mt-7 border-t border-hairline pt-5 text-center">
            <button
              type="button"
              data-testid="select-business-logout"
              (click)="logout()"
              class="text-[0.75rem] font-medium text-muted-color transition-colors duration-200 hover:text-color"
            >
              Cerrar sesión
              <span class="text-primary hover:underline"> →</span>
            </button>
          </footer>
        </main>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectBusinessPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly businessContext = inject(BusinessContextService);
  private readonly tokens = inject(AuthTokenStorage);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly hubData = inject(HubDataCacheService);
  private readonly logoutService = inject(LogoutService);

  readonly businesses = signal<BusinessMembership[]>([]);

  /**
   * La ficha de cada comercio, por id. Es decoración: llega después, puede no
   * llegar nunca (un comerciante sin `platform:read` recibe 403) y la lista se
   * dibuja igual. Nada de lo que decide la pantalla depende de esto.
   */
  readonly summaries = signal<Map<string, MerchantSummary>>(new Map());

  protected logout(): void {
    void this.logoutService.logout();
  }

  /**
   * PPR-139 — el super admin caía en "Elige tu negocio" con TODOS los comercios
   * del ecosistema listados como si fueran suyos.
   *
   * No es un problema de permisos: que pueda entrar a cualquiera es deliberado.
   * Lo que fallaba era el encuadre y la escala. Con dos comercios de prueba se
   * veía inofensivo; en producción esa es la lista completa de PROXIMA, sin
   * buscador, y su acceso real —"Acceder a Platform"— quedaba debajo de todo.
   *
   * Acá: el panel de plataforma va primero, la lista se rotula por lo que es
   * (comercios del ecosistema, entrar es soporte) y trae buscador en cuanto
   * deja de caber de un vistazo.
   */
  readonly isSuperAdmin = computed(() => this.auth.user()?.is_super_admin ?? false);

  readonly filter = signal('');

  /**
   * La tabla ancha es para quien mira el ecosistema entero. Un comerciante con
   * dos negocios no la necesita —y su API no la puede llenar—, así que se queda
   * con la tarjeta angosta de siempre.
   */
  readonly anchoDeOperador = computed(() => this.isSuperAdmin() && this.businesses().length > 0);

  readonly visibleBusinesses = computed(() => {
    const q = this.filter().trim().toLowerCase();
    const all = this.businesses();
    if (!q) return all;
    return all.filter((b) => {
      const dominio = this.summaries().get(b.id)?.website_domain ?? '';
      return (
        b.name.toLowerCase().includes(q) ||
        (b.slug ?? '').toLowerCase().includes(q) ||
        dominio.toLowerCase().includes(q)
      );
    });
  });
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    // Load /me first so user().is_super_admin is authoritative before any auto-select.
    // login() only fetches me/businesses; the base lib's isSuperAdmin() would fall back
    // to JWT kind==='admin' (true for all portal users) if we don't load the user here.
    this.auth.ensureUserLoaded().subscribe(() => {
      this.loadBusinesses();
      // Sólo tiene sentido para quien opera la plataforma; para el resto es un
      // 403 seguro. Va suelta: la lista ya se está pintando.
      if (this.auth.user()?.is_super_admin) {
        void this.hubData.getMerchantSummaries().then((m) => this.summaries.set(m));
      }
    });
  }

  loadBusinesses(): void {
    const isSuperAdmin = this.auth.user()?.is_super_admin ?? false;
    const cached = this.auth.memberships();
    if (cached.length > 0) {
      this.businesses.set(cached);
      if (cached.length === 1 && !isSuperAdmin) {
        this.select(cached[0]);
      }
      return;
    }

    this.loading.set(true);
    this.loadError.set(null);

    this.auth.getMemberships().subscribe({
      next: (data) => {
        this.businesses.set(data);
        this.loading.set(false);
        if (data.length === 1 && !isSuperAdmin) {
          this.select(data[0]);
        }
      },
      error: () => {
        this.loadError.set('No pudimos cargar tus negocios. Intenta de nuevo.');
        this.loading.set(false);
      },
    });
  }

  /**
   * El nombre del plan a secas. La API lo manda como «Lidera — Inventario,
   * almacenes, despacho y POS»: entero no entra en una etiqueta, envuelve a
   * cuatro líneas y se desborda encima de la fila de abajo.
   */
  planCorto(f: MerchantSummary): string {
    return f.plan_name ? shortPlanName(f.plan_name) : 'Gratis';
  }

  /** La ficha de un comercio, si llegó. */
  fichaDe(biz: BusinessMembership): MerchantSummary | null {
    return this.summaries().get(biz.id) ?? null;
  }

  /**
   * El estado de la tienda en tres palabras. `has_website` sin publicar es un
   * borrador — no es lo mismo que no tener tienda, y la diferencia importa
   * cuando estás mirando por qué un comercio no vende.
   */
  estadoWeb(f: MerchantSummary): { texto: string; tono: 'ok' | 'draft' | 'none' } {
    if (!f.has_website) return { texto: 'Sin tienda', tono: 'none' };
    return f.website_published
      ? { texto: 'Publicada', tono: 'ok' }
      : { texto: 'Borrador', tono: 'draft' };
  }

  /** El dominio como URL absoluta, para abrirlo en otra pestaña. */
  urlWeb(f: MerchantSummary): string | null {
    const d = (f.website_domain ?? '').trim();
    if (!d) return null;
    return /^https?:\/\//i.test(d) ? d : `https://${d}`;
  }

  /** «hace 8 m» — un comercio de la semana pasada no se lee igual que uno de 2024. */
  antiguedad(f: MerchantSummary): string {
    if (!f.created_at) return '—';
    const alta = new Date(f.created_at).getTime();
    if (Number.isNaN(alta)) return '—';
    const dias = Math.max(0, Math.floor((Date.now() - alta) / 86_400_000));
    if (dias < 30) return `hace ${dias} d`;
    const meses = Math.round(dias / 30);
    if (meses < 12) return `hace ${meses} m`;
    const anios = Math.floor(meses / 12);
    return anios === 1 ? 'hace 1 año' : `hace ${anios} años`;
  }

  actividad(f: MerchantSummary): string {
    return f.order_count_30d === 0
      ? 'Sin pedidos'
      : `${f.order_count_30d} ${f.order_count_30d === 1 ? 'pedido' : 'pedidos'}`;
  }

  facturado(f: MerchantSummary): string {
    if (f.order_count_30d === 0) return '—';
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      maximumFractionDigits: 0,
    }).format(f.revenue_30d ?? 0);
  }

  goToPlatform(): void {
    const adminUrl = this.runtimeConfig.adminUrl();
    if (!adminUrl) return;

    const params = new URLSearchParams();
    const access = this.tokens.getAccessToken();
    const refresh = this.tokens.getRefreshToken();
    if (access) params.set('sso', access);
    if (refresh) params.set('sso_refresh', refresh);
    const qs = params.toString();
    window.location.href = `${adminUrl}/platform${qs ? '?' + qs : ''}`;
  }

  select(biz: BusinessMembership): void {
    this.businessContext.applyMembership(biz);

    const next = this.route.snapshot.queryParamMap.get('next');
    if (next) {
      const config = this.runtimeConfig.requireConfig();
      const validated = validateNextUrl(next, config);
      if (validated) {
        // Cross-app handoff: pass selected business + SSO tokens so the target
        // app can bootstrap without an extra round-trip to /elegir-negocio.
        const sep = validated.includes('?') ? '&' : '?';
        let url = `${validated}${sep}sso_business=${encodeURIComponent(biz.id)}`;
        const access = this.tokens.getAccessToken();
        const refresh = this.tokens.getRefreshToken();
        if (access) url += `&sso=${encodeURIComponent(access)}`;
        if (refresh) url += `&sso_refresh=${encodeURIComponent(refresh)}`;
        window.location.href = url;
        return;
      }
    }

    // Same-app: keep Angular alive so cookie-mode _accessToken stays in memory.
    void this.router.navigateByUrl('/');
  }
}

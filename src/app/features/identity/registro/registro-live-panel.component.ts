import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { businessSlug, monogramOf } from './registro-identity.util';

/**
 * El acompañante del registro: mientras el usuario escribe, acá se arma la
 * ficha del negocio que va a existir al terminar.
 *
 * Es presentacional a propósito — no inyecta nada, solo recibe `name` y
 * `rubroLabel`. Y va entero `aria-hidden`: repite en imagen lo que el
 * formulario ya dice en texto, así que para un lector de pantalla sería
 * ruido duplicado, no información nueva.
 */
@Component({
  selector: 'app-registro-live-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './registro-live-panel.component.css',
  template: `
    <div class="stage" aria-hidden="true">
      <div class="inner">
        <span class="eyebrow">Se está armando</span>

        <div class="card">
          <span class="mono">{{ monogram() }}</span>
          <span class="meta">
            <span class="biz-name">{{ shownName() }}</span>
            <span class="biz-slug">{{ slug() }}.proxima.pe</span>
          </span>
          <span class="badge">Libre</span>
        </div>

        <div class="panel">
          <div class="panel-bar">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="panel-title">Panel de {{ shownName() }}</span>
          </div>
          <div class="panel-body">
            <div>
              <div class="row"><span class="row-k">Catálogo</span><span class="row-v">10 productos</span></div>
              <div class="bar"><span style="animation-delay: 700ms"></span></div>
            </div>
            <div class="row" style="margin-bottom: 0">
              <span class="row-k">Control de stock</span>
              <span class="row-check">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Activo
              </span>
            </div>
            <div>
              <div class="row"><span class="row-k">Pedidos del mes</span><span class="row-v">30 incluidos</span></div>
              <div class="bar"><span style="animation-delay: 1100ms"></span></div>
            </div>
          </div>
        </div>

        @if (entries().length > 0) {
          <dl class="summary">
            @for (row of entries(); track row.key) {
              <div class="summary-row">
                <dt>{{ row.label }}</dt>
                <dd>{{ row.value }}</dd>
              </div>
            }
          </dl>
        } @else {
        <div class="ticks">
          <div class="tick" style="animation-delay: 900ms">
            <span class="tick-box">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            <span class="tick-text">Tu subdominio queda reservado a tu nombre</span>
          </div>
          <div class="tick" style="animation-delay: 1080ms">
            <span class="tick-box">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            <span class="tick-text">Cargamos las categorías típicas de tu rubro</span>
          </div>
          <div class="tick" style="animation-delay: 1260ms">
            <span class="tick-box">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            <span class="tick-text">Tu plan Gratis empieza sin fecha de vencimiento</span>
          </div>
        </div>
        }

        <div class="foot">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(246,246,248,0.55)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 1px">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          <span class="foot-text">Tus datos se usan solo para crear tu cuenta. Puedes borrarla cuando quieras.</span>
        </div>
      </div>
    </div>
  `,
})
export class RegistroLivePanelComponent {
  readonly name = input<string>('');
  readonly rubroLabel = input<string>('');
  readonly hasRuc = input<boolean | null>(null);
  readonly ruc = input<string>('');
  readonly fullName = input<string>('');
  readonly email = input<string>('');

  /**
   * El resumen que se va armando. Solo entra lo que el usuario ya respondió:
   * un panel con filas vacías esperando datos es peor que uno corto.
   */
  protected readonly entries = computed(() => {
    const rows: { key: string; label: string; value: string }[] = [];
    const rubro = this.rubroLabel().trim();
    if (rubro) rows.push({ key: 'rubro', label: 'Rubro', value: rubro });

    const hasRuc = this.hasRuc();
    if (hasRuc !== null) {
      const ruc = this.ruc().trim();
      rows.push({ key: 'ruc', label: 'RUC', value: hasRuc ? ruc || 'Sí' : 'Aún no' });
    }

    const person = this.fullName().trim();
    if (person) rows.push({ key: 'person', label: 'Tu nombre', value: person });

    const email = this.email().trim();
    if (email) rows.push({ key: 'email', label: 'Correo', value: email });

    if (rows.length > 0) rows.push({ key: 'plan', label: 'Plan', value: 'Gratis · S/ 0 al mes' });
    return rows;
  });

  protected readonly shownName = computed(() => this.name().trim() || 'Tu negocio');
  protected readonly monogram = computed(() => monogramOf(this.name()));
  protected readonly slug = computed(() => businessSlug(this.name()));
}

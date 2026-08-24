import { RegistroCodeInputComponent } from './registro-code-input.component';
import { RegistroLivePanelComponent } from './registro-live-panel.component';
import { RegistroPageComponent } from './registro-page.component';

/**
 * Dos reglas que se rompen sin que nadie se entere hasta que alguien abre la
 * página en un celular o con «reducir movimiento» activado.
 *
 * El CSS se lee de los estilos **compilados** del componente (`ɵcmp.styles`),
 * no del archivo en disco: es exactamente lo que se envía al navegador, así
 * que una hoja huérfana que nadie referencia no puede aprobar este spec.
 */

type CompiledComponent = { ɵcmp?: { styles?: string[] } };

function stylesOf(component: unknown, name: string): string {
  const styles = (component as CompiledComponent).ɵcmp?.styles ?? [];
  if (styles.length === 0) throw new Error(`${name} no tiene estilos compilados`);
  return styles.join('\n');
}

const SHEETS = [
  { name: 'registro-page', css: stylesOf(RegistroPageComponent, 'registro-page') },
  { name: 'registro-live-panel', css: stylesOf(RegistroLivePanelComponent, 'registro-live-panel') },
  { name: 'registro-code-input', css: stylesOf(RegistroCodeInputComponent, 'registro-code-input') },
];

/** Contenido de todos los bloques `prefers-reduced-motion: reduce` de una hoja. */
function reducedMotionBlocks(css: string): string {
  const marker = 'prefers-reduced-motion';
  let out = '';
  let from = css.indexOf(marker);
  while (from !== -1) {
    const open = css.indexOf('{', from);
    let depth = 0;
    let i = open;
    for (; i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    out += css.slice(open + 1, i);
    from = css.indexOf(marker, i);
  }
  return out;
}

/** Selectores que declaran `animation:` o `animation-name:` fuera de esos bloques. */
function animatedSelectors(css: string): string[] {
  const reduced = reducedMotionBlocks(css);
  const rest = reduced ? css.split(reduced).join('') : css;
  const found: string[] = [];
  const rule = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = rule.exec(rest)) !== null) {
    const [, selector, body] = match;
    if (!/(^|[;\s])animation(-name)?\s*:/.test(body)) continue;
    const trimmed = selector.trim();
    // Los pasos de un `@keyframes` (`from`, `to`, `0%`) no son selectores anulables.
    if (trimmed.startsWith('@') || /^(from|to|[\d.]+%)$/.test(trimmed)) continue;
    trimmed
      .split(',')
      .map((part) => part.replace(/\[_ngcontent[^\]]*\]/g, '').trim())
      .filter(Boolean)
      .forEach((part) => found.push(part));
  }
  return [...new Set(found)];
}

function overriddenSelectors(css: string): string[] {
  const reduced = reducedMotionBlocks(css);
  return reduced
    .split('}')
    .flatMap((chunk) => chunk.split('{')[0].split(','))
    .map((part) => part.replace(/\[_ngcontent[^\]]*\]/g, '').trim())
    .filter(Boolean);
}

describe('Registro — reglas de CSS', () => {
  it('el panel se retira bajo 1024 px y el formulario queda a ancho completo', () => {
    const css = SHEETS[0].css;
    const breakpoint = css.slice(css.indexOf('@media (max-width: 1024px)'));

    expect(css).toContain('@media (max-width: 1024px)');
    expect(breakpoint).toMatch(/\.reg-stage[^{]*\{[^}]*display:\s*none/);
    expect(breakpoint).toMatch(/\.reg-left[^{]*\{[^}]*width:\s*100%/);
  });

  it('toda animación tiene su anulación bajo prefers-reduced-motion', () => {
    const offenders: string[] = [];

    for (const { name, css } of SHEETS) {
      const overridden = overriddenSelectors(css);
      for (const selector of animatedSelectors(css)) {
        if (!overridden.includes(selector)) offenders.push(`${name}: ${selector}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('el spec ve animaciones de verdad (no aprueba por leer una hoja vacía)', () => {
    const all = SHEETS.flatMap(({ css }) => animatedSelectors(css));
    expect(all.length).toBeGreaterThanOrEqual(5);
  });
});

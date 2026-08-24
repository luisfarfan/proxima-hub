import { PlanPageComponent } from './plan-page.component';

/**
 * Igual que en el registro: el CSS se lee de los estilos compilados del
 * componente, que es lo que llega al navegador. Una hoja que nadie referencia
 * no puede aprobar este spec.
 */

type CompiledComponent = { ɵcmp?: { styles?: string[] } };

const CSS = (((PlanPageComponent as unknown as CompiledComponent).ɵcmp?.styles ?? []).join('\n'));

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
  return reducedMotionBlocks(css)
    .split('}')
    .flatMap((chunk) => chunk.split('{')[0].split(','))
    .map((part) => part.replace(/\[_ngcontent[^\]]*\]/g, '').trim())
    .filter(Boolean);
}

describe('Plan — reglas de CSS', () => {
  it('los estilos del componente están compilados y traen lo nuevo', () => {
    expect(CSS.length).toBeGreaterThan(0);
    expect(CSS).toContain('.plan-card');
    expect(CSS).toContain('.usage-strip');
    expect(CSS).toContain('.addon-card');
    expect(CSS).toContain('.total-bar');
  });

  it('las tarjetas pasan a una sola columna en pantallas chicas', () => {
    const breakpoint = CSS.slice(CSS.indexOf('@media (max-width: 640px)'));

    expect(CSS).toContain('@media (max-width: 640px)');
    expect(breakpoint).toMatch(/\.plan-cards[^{]*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });

  it('toda animación tiene su anulación bajo prefers-reduced-motion', () => {
    const overridden = overriddenSelectors(CSS);
    const offenders = animatedSelectors(CSS).filter((s) => !overridden.includes(s));

    expect(offenders).toEqual([]);
  });
});

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
    expect(CSS).toContain('.rung');
    expect(CSS).toContain('.step-detail');
    expect(CSS).toContain('.usage-strip');
    expect(CSS).toContain('.addon-card');
    expect(CSS).toContain('.total-bar');
  });

  it('el peldaño seleccionado le gana al peldaño actual', () => {
    // Misma especificidad: si `.is-now` viniera después, elegir tu propio plan
    // perdería el azul contra el gris de «estás aquí».
    expect(CSS.indexOf('.rung.is-now')).toBeLessThan(CSS.indexOf('.rung.is-on'));
  });

  it('la franja de uso acomoda las cuotas que haya, no exactamente tres', () => {
    // Con `repeat(3, …)` la cuarta cuota caía sola a una segunda fila y las
    // etiquetas largas se pisaban con su número.
    expect(CSS).toMatch(/\.usage-meters[^{]*\{[^}]*grid-template-columns:\s*repeat\(auto-fit/);
    expect(CSS).not.toMatch(/\.usage-meters[^{]*\{[^}]*repeat\(3,/);
  });

  it('la escalera se vuelve lista en pantallas chicas', () => {
    // Cinco peldaños en 860 px dejan 150 px cada uno: ilegible en horizontal.
    const breakpoint = CSS.slice(CSS.indexOf('@media (max-width: 860px)'));

    expect(CSS).toContain('@media (max-width: 860px)');
    expect(breakpoint).toMatch(/\.ladder[^-{][^{]*\{[^}]*flex-direction:\s*column/);
    expect(breakpoint).toMatch(/\.step-detail[^{]*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });

  it('toda animación tiene su anulación bajo prefers-reduced-motion', () => {
    const overridden = overriddenSelectors(CSS);
    const offenders = animatedSelectors(CSS).filter((s) => !overridden.includes(s));

    expect(offenders).toEqual([]);
  });
});

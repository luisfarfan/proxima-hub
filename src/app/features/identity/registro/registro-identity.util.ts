/**
 * El nombre del negocio se convierte en dos cosas visibles antes de que exista
 * la cuenta: el monograma de la ficha y el subdominio que se va a reservar.
 * Viven acá porque la página y el panel en vivo tienen que coincidir carácter
 * por carácter — si divergen, el usuario ve un slug en el panel y otro al final.
 */

/** `Bodega San Martín` → `bodega-san-martin`. Vacío → `tu-negocio`. */
export function businessSlug(name: string | null | undefined): string {
  const slug = (name ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'tu-negocio';
}

/** Primera letra en mayúscula. Vacío → `·`, para que la ficha nunca quede hueca. */
export function monogramOf(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '·';
}

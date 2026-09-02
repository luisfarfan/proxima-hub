/**
 * `PlanSummary.name` viene como «Lidera — Inventario, almacenes, despacho y
 * POS»: sirve para un listado de planes, no para una etiqueta.
 *
 * Vivía dentro de home.component.ts. Ahora lo necesitan dos pantallas —el
 * centro del Hub y elegir comercio— y una regla de parseo duplicada en dos
 * sitios se separa sola en cuanto alguien toque una de las dos.
 */
export function shortPlanName(name: string): string {
  return name.split('—')[0].trim() || name;
}

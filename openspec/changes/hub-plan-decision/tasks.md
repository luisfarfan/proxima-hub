# Tasks — hub-plan-decision

> Dirección «A · Tu uso decide» (`tasks/design-canvas/PlanA.dc.html`).
> Todo sale de datos que la API ya devuelve. Cada tarea se verifica con su propio spec de vitest acotado.

## 1. Datos completos

- [x] `T001` Catálogo de planes tipado con cuotas y features
  - Type: implementation
  - Area: hub/account
  - Depends on: none
  - Verification: `pnpm exec ng test --watch=false --include=src/app/features/hub/account/plan-catalog.spec.ts`
  - Human review: false
  - Parallelizable: false
  - License notes: none
  - Acceptance:
    - La interfaz `Plan` del hub declara `quotas` y `features`, y ambas se llenan tal cual vienen de `GET billing/plans`.
    - Un plan sin `quotas` no rompe la página: se renderiza sin saltos de cuota.
    - Los planes se ordenan por `monthly_price` ascendente.

## 2. El argumento del cambio de plan

- [x] `T002` Tarjetas de plan con lo que se desbloquea y los saltos de cuota
  - Type: implementation
  - Area: hub/account
  - Depends on: T001
  - Verification: `pnpm exec ng test --watch=false --include=src/app/features/hub/account/plan-cards.spec.ts`
  - Human review: false
  - Parallelizable: false
  - License notes: none
  - Acceptance:
    - Cada plan superior al actual lista solo las features que el plan actual no tiene, calculadas comparando los `features` de ambos.
    - Cada cuota que sube se muestra como `actual → nuevo` con los números que vienen en `quotas`.
    - El plan actual se marca como tal y no ofrece botón de cambio.
    - Las features incluidas en el plan actual se renderizan con el tratamiento de incluido, no con el de no disponible.
    - Los estilos del componente viven en `plan-page.component.css` referenciado por `styleUrl`, no en un bloque `styles` inline. (El reparto entre archivo y bloque inline no es observable en runtime; lo que el spec verifica es que las reglas nuevas estén en los estilos compilados del componente — ver `T005`.)

- [x] `T003` Franja de uso real y plan sugerido
  - Type: implementation
  - Area: hub/account
  - Depends on: T001
  - Verification: `pnpm exec ng test --watch=false --include=src/app/features/hub/account/plan-usage.spec.ts`
  - Human review: false
  - Parallelizable: true
  - License notes: none
  - Acceptance:
    - La franja muestra cada entrada de `usage` de `admin/billing/subscription/status` con su porcentaje de consumo.
    - Una cuota al 80 % o más se marca con el color de alerta y la copia dice cuánto queda de esa cuota.
    - El plan sugerido es el más barato cuyas `quotas` superan todos los recursos que están al 80 % o más; si ninguno los supera, no se sugiere ningún plan.
    - Si la llamada a `status` falla, la franja no se renderiza y el resto de la página sigue funcionando.

## 3. Add-ons honestos

- [x] `T004` Add-on Tienda Web con su piso de plan y el total mensual
  - Type: implementation
  - Area: hub/account
  - Depends on: T002
  - Verification: `pnpm exec ng test --watch=false --include=src/app/features/hub/account/plan-addons.spec.ts`
  - Human review: false
  - Parallelizable: false
  - License notes: none
  - Acceptance:
    - `ADDON_DEFS` declara `minPlan: 'emprende'` y `monthlyPrice: 50` para `tienda_web`.
    - Con el plan Gratis activo, la tarjeta muestra el piso de plan en texto y su CTA no navega a ninguna parte.
    - Con Emprende o superior, el CTA de `tienda_web` sigue abriendo el asistente de proxima-admin y en ningún caso llama a `billing/addon/checkout`.
    - La barra de total suma el precio del plan seleccionado más el de los add-ons activos y lo muestra como un solo monto mensual.

## 4. Disciplina de CSS

- [x] `T005` Tarjetas en 390 px y respeto a prefers-reduced-motion
  - Type: implementation
  - Area: hub/account
  - Depends on: T002, T003, T004
  - Verification: `pnpm exec ng test --watch=false --include=src/app/features/hub/account/plan-css-rules.spec.ts`
  - Human review: false
  - Parallelizable: false
  - License notes: none
  - Acceptance:
    - `plan-page.component.css` declara un bloque `@media (max-width: 640px)` que pone las tarjetas de plan en una sola columna.
    - Cada selector que declara `animation` en `plan-page.component.css` tiene una anulación dentro de un bloque `@media (prefers-reduced-motion: reduce)` del mismo archivo.
    - El spec lee el archivo CSS desde disco, así que falla si se agrega una animación nueva sin su anulación.

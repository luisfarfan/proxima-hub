# Tasks — hub-registro-taller-vivo

> Dirección «A · Taller en vivo» (`tasks/design-canvas/RegistroA.dc.html` + `RegistroDetalle.dc.html`).
> Se mantiene la máquina de 3 pasos. Cada tarea se verifica con su propio spec de vitest acotado.

## 1. Acompañamiento visible

- [x] `T001` Panel presentacional del negocio en vivo
  - Type: implementation
  - Area: identity/registro
  - Depends on: none
  - Verification: `pnpm exec ng test --watch=false --include=src/app/features/identity/registro/registro-live-panel.component.spec.ts`
  - Human review: false
  - Parallelizable: true
  - License notes: none
  - Acceptance:
    - Con `name = 'Bodega San Martín'` el DOM contiene el monograma `B` y el texto `bodega-san-martin.proxima.pe`.
    - Con `name` vacío el DOM contiene `tu-negocio.proxima.pe` y el componente no lanza.
    - El componente recibe todo por `input()` y no inyecta `HttpClient` ni `AuthService`.
    - El contenedor raíz del panel lleva `aria-hidden="true"`: no repite al lector de pantalla lo que ya dice el formulario.

- [x] `T002` Registro a dos columnas con riel de pasos nombrado
  - Type: implementation
  - Area: identity/registro
  - Depends on: T001
  - Verification: `pnpm exec ng test --watch=false --include=src/app/features/identity/registro/registro-page.layout.spec.ts`
  - Human review: false
  - Parallelizable: false
  - License notes: none
  - Acceptance:
    - En el paso 1 se renderizan a la vez el formulario y `app-registro-live-panel`.
    - El riel muestra los tres nombres «Tu negocio», «Tu cuenta» y «Listo», y el paso actual lleva `aria-current="step"`.
    - Sigue existiendo un único `h1` con `tabindex="-1"` que recibe el foco al cambiar de paso.
    - El `role="progressbar"` conserva `aria-valuenow` igual al número de paso.

## 2. Preguntas que declaran su consecuencia

- [x] `T003` Rubro con chips rápidos sobre el catálogo real
  - Type: implementation
  - Area: identity/registro
  - Depends on: T002
  - Verification: `pnpm exec ng test --watch=false --include=src/app/features/identity/registro/registro-rubro.spec.ts`
  - Human review: false
  - Parallelizable: true
  - License notes: none
  - Acceptance:
    - Se renderizan como máximo 6 chips y cada etiqueta sale de la respuesta de `acquisition/categories`, en el orden en que la API la devuelve.
    - Hacer clic en un chip deja `negocio.controls.rubro` con el `id` de ese rubro.
    - El `p-select` con el catálogo completo sigue presente, y elegir ahí un rubro que también es chip lo deja marcado.
    - Si `acquisition/categories` falla, no se renderiza ningún chip y la página sigue montando.

- [x] `T004` RUC como dos opciones que explican su consecuencia
  - Type: implementation
  - Area: identity/registro
  - Depends on: T002
  - Verification: `pnpm exec ng test --watch=false --include=src/app/features/identity/registro/registro-ruc.spec.ts`
  - Human review: false
  - Parallelizable: true
  - License notes: none
  - Acceptance:
    - Las dos opciones son `role="radio"` dentro de un `role="radiogroup"` cuyo nombre accesible es «¿Tu negocio tiene RUC?».
    - Cada opción muestra en texto qué pasa al elegirla: que SUNAT completa la razón social, o que el RUC se puede agregar después.
    - Elegir «Sí» revela el campo RUC y su botón Verificar; elegir «Aún no» los oculta y deja vacío el control `ruc`.
    - Un `lookup-ruc` con estado `ok` sigue mostrando `razon_social` y `estado`.

## 3. Micro-estados

- [x] `T005` Código de verificación en seis casillas
  - Type: implementation
  - Area: identity/registro
  - Depends on: none
  - Verification: `pnpm exec ng test --watch=false --include=src/app/features/identity/registro/registro-otp.spec.ts`
  - Human review: false
  - Parallelizable: true
  - License notes: none
  - Acceptance:
    - Escribir un dígito mueve el foco a la casilla siguiente, y Backspace en una casilla vacía lo devuelve a la anterior.
    - Pegar `419207` en la primera casilla llena las seis y deja `codeCtrl` con `419207`.
    - El grupo tiene un nombre accesible propio y los errores del código siguen llegando en un elemento con `role="alert"`.
    - La primera casilla conserva `autocomplete="one-time-code"` e `inputmode="numeric"`.

- [x] `T006` Medidor de contraseña con reglas visibles
  - Type: implementation
  - Area: identity/registro
  - Depends on: none
  - Verification: `pnpm exec ng test --watch=false --include=src/app/features/identity/registro/registro-password.spec.ts`
  - Human review: false
  - Parallelizable: true
  - License notes: none
  - Acceptance:
    - Con menos de 8 caracteres el medidor marca 1 de 4 segmentos y la regla «al menos 8 caracteres» aparece sin cumplir.
    - Con 8 o más caracteres y al menos un dígito o una mayúscula, el medidor marca 3 de 4 y ambas reglas quedan cumplidas.
    - El estado del medidor vive en un contenedor `aria-live="polite"`.
    - La única validación que bloquea el paso sigue siendo `minLength(8)`: el medidor no agrega requisitos nuevos.

- [x] `T007` Pantalla de creación de cuenta con pasos visibles
  - Type: implementation
  - Area: identity/registro
  - Depends on: T002
  - Verification: `pnpm exec ng test --watch=false --include=src/app/features/identity/registro/registro-submitting.spec.ts`
  - Human review: false
  - Parallelizable: false
  - License notes: none
  - Acceptance:
    - Mientras `submitting()` es `true` se listan los tres pasos de creación dentro de un contenedor `aria-live="polite"`.
    - Al resolver con éxito, la pantalla final conserva el texto «Tu cuenta está lista».
    - Si el submit falla, los pasos desaparecen y el error vuelve a mostrarse en el paso 3 con `role="alert"`.

## 4. Disciplina de CSS

- [x] `T008` Colapso bajo 1024 px y respeto a prefers-reduced-motion
  - Type: implementation
  - Area: identity/registro
  - Depends on: T002
  - Verification: `pnpm exec ng test --watch=false --include=src/app/features/identity/registro/registro-css-rules.spec.ts`
  - Human review: false
  - Parallelizable: false
  - License notes: none
  - Acceptance:
    - `registro-page.component.css` declara un bloque `@media (max-width: 1024px)` que deja el panel en `display: none` y el formulario a ancho completo.
    - Cada selector que declara `animation` en los CSS del directorio del registro tiene una anulación dentro de un bloque `@media (prefers-reduced-motion: reduce)` del mismo archivo.
    - El spec lee los estilos compilados del componente (`ɵcmp.styles`) —no el archivo en disco, porque el repo no tiene `@types/node`—, así que falla si se agrega una animación nueva sin su anulación.

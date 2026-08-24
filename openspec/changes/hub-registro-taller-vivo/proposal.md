## Why

El registro de comercio (`/registro`) funciona, pero **pide sin explicar**. Tres cosas concretas, leídas del código actual:

- La columna del formulario mide **408 px** y está centrada: el resto de la pantalla no hace nada. Mientras el usuario escribe, nada le muestra qué está construyendo ni qué gana.
- **«¿Tu negocio tiene RUC?»** no dice qué cambia si responde que sí — justo cuando el RUC ya trae la razón social desde SUNAT, que es el argumento para responderlo.
- El progreso es una **línea de 2 px** sin hitos con nombre ni tiempo estimado; el único aviso de paso vive en un eyebrow de 11 px.

El resultado es un formulario que se siente vacío y arbitrario en el momento de mayor fricción del funnel. La dirección elegida («Taller en vivo», artboard `tasks/design-canvas/RegistroA.dc.html`) mantiene la máquina de 3 pasos y ataca lo que falta: acompañamiento visible y ayuda en el momento exacto.

## What Changes

- **Panel del negocio en vivo:** columna derecha que arma la ficha del comercio mientras se escribe — monograma, nombre, subdominio `.proxima.pe`, cuotas del plan Gratis y lo que queda listo al terminar.
- **Riel de pasos con nombre** («Tu negocio», «Tu cuenta», «Listo») y estimado de tiempo, sobre el `role="progressbar"` que ya existe.
- **Rubro con chips rápidos** alimentados por `acquisition/categories`, conservando el `p-select` con el catálogo completo (70 rubros).
- **RUC como dos opciones que declaran su consecuencia** (SUNAT completa la razón social / se puede agregar después), en un `radiogroup` accesible.
- **Micro-estados** (artboard `RegistroDetalle.dc.html`): código de verificación en seis casillas con foco y pegado, medidor de contraseña con reglas visibles, y pantalla de creación de cuenta que muestra los pasos.
- **CSS disciplinado:** el panel colapsa bajo 1024 px y toda animación nueva se anula bajo `prefers-reduced-motion`.

## Non-goals

- Cambiar la máquina de 3 pasos, los endpoints de registro o el contrato de `register/start`.
- Tocar `/plan` — es el cambio `hub-plan-decision`.
- La dirección alternativa «Una pregunta a la vez» (`RegistroB.dc.html`), descartada en la revisión de diseño.

## Capabilities

### New Capabilities
- `hub-registro-guiado`: el registro acompaña la decisión en vez de solo recogerla — muestra lo que se está construyendo, declara la consecuencia de cada pregunta y explica cada estado de espera.

## Impact

- `proxima-hub`: `src/app/features/identity/registro/` (componente, plantilla, estilos y un componente presentacional nuevo), `src/styles/registro-prime.css`.
- Sin cambios en `proxima-api`.

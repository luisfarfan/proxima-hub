## Why

En el Hub `/plan` los planes son **filas de texto**. Leído del código actual:

- Cada plan muestra su nombre, su `description` y un botón. **No se ve qué gana el usuario al subir**: las `features` y `quotas` que la API ya devuelve no se usan para nada.
- El uso real del negocio (`usage` de `admin/billing/subscription/status`) se muestra como barras sueltas arriba, sin conectar con ninguna decisión.
- El add-on **Tienda Web** ofrece «Crear mi tienda» sin decir que exige al menos el plan Emprende. Ese piso (`min_plan`) hoy solo lo aplica el backend en `provision_addon`, así que el usuario se entera cuando algo falla.
- Nunca se ve el **costo total mensual** de la combinación que está eligiendo.

El upgrade llega sin argumento justo en el momento de mayor intención. La dirección elegida («A · Tu uso decide», artboard `tasks/design-canvas/PlanA.dc.html`) usa datos que ya están en la respuesta de la API.

## What Changes

- **Tarjetas de plan** en vez de filas: precio, lo que se desbloquea (diferencia real de `features` contra el plan actual) y los saltos de cuota (`10 → 500` productos) calculados desde `quotas`.
- **Franja de uso** arriba, que motiva la recomendación: cada recurso con su porcentaje, en alerta desde el 80 %, y el plan más barato que lo resuelve. Si ninguno aplica, no se sugiere nada.
- **Add-on Tienda Web con su piso de plan visible** antes de intentarlo, y el hand-off al asistente de proxima-admin intacto (nunca `billing/addon/checkout`, que es el defecto ya corregido).
- **Barra de total mensual**: plan elegido más add-ons activos, en un solo monto.
- Los estilos inline del componente pasan a `plan-page.component.css`.

## Non-goals

- Reconstruir el **asistente de Tienda Web**: vive en `proxima-admin` (`/websites/nueva`). El artboard `AddonTienda.dc.html` es especificación para ese repo, no para este.
- Cambiar endpoints, el modelo de planes/add-ons o el flujo de checkout de MercadoPago.
- Tocar el registro — es el cambio `hub-registro-taller-vivo`.

## Capabilities

### New Capabilities
- `hub-plan-decision`: `/plan` argumenta el cambio de plan con los datos que la API ya devuelve — diferencia de features, saltos de cuota, uso real y costo total — y comunica los pisos de plan antes de que el usuario choque con ellos.

## Impact

- `proxima-hub`: `src/app/features/hub/account/plan-page.component.ts` y su CSS extraído.
- Sin cambios en `proxima-api`: `GET billing/plans` ya devuelve `features` y `quotas` (`PlanRead`).

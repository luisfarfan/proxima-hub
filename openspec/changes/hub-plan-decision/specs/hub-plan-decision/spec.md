## ADDED Requirements

### Requirement: El catálogo muestra la diferencia, no una lista
Cada plan superior al actual SHALL mostrar únicamente lo que agrega respecto del plan vigente, calculado comparando las `features` de ambos, y los saltos de cuota como `actual → nuevo` a partir de `quotas`. Las features que el plan actual ya incluye NO MUST renderizarse con el tratamiento visual de «no disponible».

#### Scenario: Un comercio en Gratis mira Emprende
- **WHEN** el plan vigente es Gratis y se muestra Emprende
- **THEN** se listan solo las capacidades que Gratis no tiene, y las cuotas que suben aparecen como `10 → 500`

#### Scenario: Un plan sin cuotas declaradas
- **WHEN** la API devuelve un plan sin `quotas`
- **THEN** su tarjeta se renderiza sin saltos de cuota y la página no falla

### Requirement: El uso real motiva la recomendación
La página SHALL mostrar el consumo de cada recurso del plan vigente y marcar en alerta los que estén al 80 % o más. El plan sugerido MUST ser el más barato cuyas `quotas` superan todos los recursos en alerta; si ninguno los supera, NO MUST sugerirse ningún plan.

#### Scenario: Catálogo casi lleno
- **WHEN** el negocio tiene 9 de 10 productos
- **THEN** la cuota de productos se marca en alerta, la copia dice cuánto queda, y se sugiere el plan más barato que la supera

#### Scenario: Sin señal de uso
- **WHEN** la consulta de estado de suscripción falla
- **THEN** la franja de uso no se renderiza y el resto de la página sigue funcionando

### Requirement: Los pisos de plan se comunican antes de chocar con ellos
Un add-on con `min_plan` declarado SHALL mostrar ese piso en texto cuando el plan vigente no lo alcanza, y su llamada a la acción NO MUST iniciar ningún flujo en ese estado. El add-on `tienda_web` MUST seguir abriendo el asistente de `proxima-admin` y nunca `billing/addon/checkout`, porque el aprovisionamiento exige el `template_id` que solo el asistente reúne.

#### Scenario: Tienda Web desde el plan Gratis
- **WHEN** el plan vigente es Gratis
- **THEN** la tarjeta de Tienda Web declara que requiere al menos Emprende y su botón no navega

#### Scenario: Tienda Web desde Emprende
- **WHEN** el plan vigente es Emprende o superior
- **THEN** la llamada a la acción abre el asistente de tienda de proxima-admin

### Requirement: El costo total es visible antes de confirmar
La página SHALL mostrar, como un único monto mensual, la suma del plan seleccionado más los add-ons activos.

#### Scenario: Plan más add-on
- **WHEN** el usuario tiene seleccionado Emprende y la Tienda Web activa
- **THEN** el total mensual se muestra como un solo monto que incluye ambos

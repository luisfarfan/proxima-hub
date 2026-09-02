## ADDED Requirements

### Requirement: El registro muestra lo que se está construyendo
Mientras el usuario completa el registro, la pantalla SHALL mostrar la ficha del negocio armándose con los datos ya ingresados: monograma, nombre, rubro y el subdominio `.proxima.pe` que quedará reservado. Ese panel MUST ser decorativo para tecnologías asistivas (`aria-hidden`), porque repite información que el formulario ya expone.

#### Scenario: El nombre alimenta la ficha
- **WHEN** el usuario escribe «Bodega San Martín» en el nombre del negocio
- **THEN** el panel muestra el monograma «B» y `bodega-san-martin.proxima.pe`

#### Scenario: Sin nombre todavía
- **WHEN** el campo de nombre está vacío
- **THEN** el panel muestra el subdominio de ejemplo `tu-negocio.proxima.pe` y la página no falla

### Requirement: Cada pregunta declara su consecuencia
Toda pregunta del registro que cambie lo que el sistema hace después SHALL declarar esa consecuencia en texto, junto a la opción. La pregunta del RUC MUST ofrecerse como un `radiogroup` accesible cuyas opciones expliquen qué ocurre al elegir cada una.

#### Scenario: El usuario declara que tiene RUC
- **WHEN** elige «Sí, tengo RUC»
- **THEN** lee que SUNAT completará la razón social, y aparecen el campo RUC y su botón de verificación

#### Scenario: El usuario aún no tiene RUC
- **WHEN** elige «Aún no»
- **THEN** lee que puede agregarlo después sin rehacer nada, y el control `ruc` queda vacío y oculto

### Requirement: El progreso del registro tiene nombre
El indicador de progreso SHALL nombrar los tres hitos del registro y marcar el actual de forma programática (`aria-current="step"`), conservando el `role="progressbar"` con su `aria-valuenow`. El foco MUST seguir aterrizando en el encabezado del paso al avanzar o retroceder.

#### Scenario: Avanzar de paso
- **WHEN** el usuario pasa del paso 1 al paso 2
- **THEN** el hito «Tu cuenta» queda marcado como actual y el encabezado del paso recibe el foco

### Requirement: Los estados de espera se explican solos
Cada estado de espera o verificación del registro SHALL comunicar qué está pasando y qué puede hacer el usuario: verificación de correo, consulta de RUC, fuerza de contraseña, código de seis dígitos y creación de la cuenta. Ningún medidor de contraseña MUST agregar requisitos de validación por encima del mínimo ya vigente.

#### Scenario: Código de verificación
- **WHEN** el usuario pega el código de seis dígitos en la primera casilla
- **THEN** las seis casillas quedan llenas y el control del código toma ese valor

#### Scenario: Creando la cuenta
- **WHEN** el envío del registro está en curso
- **THEN** se listan los pasos de creación en una región `aria-live="polite"`, y si falla vuelve el error del paso 3 en `role="alert"`

### Requirement: El acompañamiento no rompe pantallas chicas ni preferencias de movimiento
El panel de acompañamiento SHALL ocultarse bajo 1024 px de ancho, dejando el formulario a ancho completo. Toda animación declarada en los estilos del registro MUST tener su anulación bajo `@media (prefers-reduced-motion: reduce)`.

#### Scenario: Pantalla angosta
- **WHEN** el viewport mide menos de 1024 px
- **THEN** el panel no se muestra y el formulario ocupa el ancho disponible

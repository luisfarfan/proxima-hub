## ADDED Requirements

### Requirement: La cookie de sesión vive en el namespace reservado de la suite
La cookie de sesión compartida MUST estar scopeada al namespace de la suite (`Domain=.app.proxima.pe`), de modo que solo alcance a los apps de la suite (`app.proxima.pe` y `*.app.proxima.pe`). Las tiendas de comercios viven en `{slug}.proxima.pe` (slugs libres) y NO MUST estar bajo el dominio de la cookie.

#### Scenario: La tienda de un comercio no recibe la cookie de la suite
- **WHEN** un usuario con sesión en la suite visita `pepito.proxima.pe`
- **THEN** `pepito.proxima.pe` no está bajo `.app.proxima.pe`
- **THEN** el navegador NO adjunta la cookie de sesión a las peticiones de esa tienda

#### Scenario: Los apps de la suite sí reciben la cookie
- **WHEN** el navegador hace una petición a `admin.app.proxima.pe` o `api.app.proxima.pe`
- **THEN** la cookie `Domain=.app.proxima.pe` se adjunta

### Requirement: Slugs de subdominio reservados para la infraestructura
La plataforma MUST rechazar que un comercio registre (o se le auto-sugiera) un slug de tienda que colisione con un subdominio de infraestructura (`app`, `api`, `admin`, `pos`, `builder`, `intelligence`, `www`, `mail`, `cdn`, `media`, `static`, `assets`, `id`, `auth`, `login`, `hub`, `dashboard`, `status`, `help`, `docs`, `blog`). La comparación MUST ser case-insensitive y normalizada.

#### Scenario: Un slug reservado es rechazado
- **WHEN** un comercio intenta registrar la tienda `app` (o `Api`, `ADMIN`, …)
- **THEN** la plataforma rechaza el alta del subdominio

#### Scenario: El auto-sugeridor nunca produce un slug reservado
- **WHEN** el sistema sugiere un slug a partir del nombre del negocio
- **THEN** el slug sugerido no pertenece a la blocklist reservada

### Requirement: `next` restringido a hosts de la suite
La validación de `next` MUST aceptar solo hosts de la **suite** en producción (`app.proxima.pe` y `*.app.proxima.pe`), no cualquier `*.proxima.pe`. En dev se permiten además `localhost`/`*.localhost`/`*.proxima.test`.

#### Scenario: next a un subdominio de tienda es rechazado
- **WHEN** se invoca `app.proxima.pe/login?next=https://pepito.proxima.pe/`
- **THEN** el `next` se considera inválido y el usuario aterriza en el home del Hub

#### Scenario: next a un app de la suite es aceptado
- **WHEN** se invoca `app.proxima.pe/login?next=https://admin.app.proxima.pe/catalog`
- **THEN** tras autenticar, el usuario vuelve a `admin.app.proxima.pe/catalog`

### Requirement: El token no viaja en la URL en modo cookie
En modo cookie (producción), el handoff de sesión entre apps NO MUST incluir el access token ni el refresh token como parámetros de URL (`?sso=`, `?sso_refresh=`). La cookie compartida es el único portador de la sesión. El handoff por URL queda restringido a modo dev/token.

#### Scenario: Salto cross-app en prod no expone token
- **WHEN** un usuario autenticado abre `admin.app.proxima.pe` desde el app-switcher del Hub (modo cookie)
- **THEN** la URL resultante NO contiene `sso` ni `sso_refresh`
- **THEN** admin autentica usando la cookie compartida

### Requirement: Protección CSRF para autenticación por cookie
Para peticiones que mutan estado autenticadas por **cookie**, el API MUST validar el `Origin`/`Referer` contra la allowlist de la suite y rechazar (403) las que no pertenezcan. Las peticiones autenticadas por `Authorization: Bearer` están exentas (un header de autorización no es CSRF-able cross-origin).

#### Scenario: Origen no-suite con cookie es rechazado
- **WHEN** una página fuera de la allowlist de suite hace una petición de mutación a la API con la cookie de sesión
- **THEN** el API responde 403

#### Scenario: Petición con Bearer no requiere validación de origen
- **WHEN** un app de la suite hace una petición con `Authorization: Bearer <token>`
- **THEN** el API no la rechaza por origen

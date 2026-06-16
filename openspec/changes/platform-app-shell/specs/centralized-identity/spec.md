## ADDED Requirements

### Requirement: La identidad vive solo en el Hub
Las páginas de identidad (login, registro, recuperar/restablecer/verificar correo, activar cuenta, elegir-negocio) SHALL existir únicamente en `proxima-hub` (`app.proxima.pe`). Los apps de producto (admin, builder, pos) NO MUST tener formularios de login propios.

#### Scenario: Un app de producto no expone login
- **WHEN** se inspeccionan las rutas públicas de `admin.proxima.pe` (tras la migración)
- **THEN** no existe una ruta `/login` con formulario de credenciales
- **THEN** la única ruta de entrada sin sesión redirige al Hub

### Requirement: Delegación de sesión por redirect + cookie compartida
Cuando un usuario sin sesión accede a un app de producto, ese app SHALL redirigir a `app.proxima.pe/login?next=<url-original>`. Tras autenticarse, el Hub MUST establecer la cookie de sesión en `.proxima.pe` y redirigir a `next`. El app de producto, ya con la cookie, MUST permitir el acceso sin pedir login de nuevo.

#### Scenario: Acceso sin sesión a admin
- **WHEN** un usuario sin cookie de sesión abre `admin.proxima.pe/catalog`
- **THEN** es redirigido a `app.proxima.pe/login?next=https://admin.proxima.pe/catalog`
- **WHEN** se autentica en el Hub
- **THEN** vuelve a `admin.proxima.pe/catalog` ya con sesión, sin re-login

### Requirement: `next` validado contra allowlist
El parámetro `next` SHALL validarse contra una allowlist de hosts `*.proxima.pe` (y `localhost`/`*.localhost` en dev). Un `next` que no pertenezca a la allowlist MUST ignorarse y caer al home del Hub (anti open-redirect).

#### Scenario: next malicioso es rechazado
- **WHEN** se invoca `app.proxima.pe/login?next=https://evil.com`
- **THEN** tras autenticar, el usuario aterriza en el home del Hub, no en evil.com

### Requirement: Logout global
El logout SHALL ejecutarse en el Hub (`POST /auth/logout`), invalidando la sesión y limpiando la cookie `.proxima.pe`, de modo que afecte a todos los apps de la suite.

#### Scenario: Logout cierra todo
- **WHEN** el usuario hace logout en el Hub
- **THEN** la cookie `.proxima.pe` se elimina
- **THEN** al volver a abrir cualquier app de producto, se le pide autenticación de nuevo

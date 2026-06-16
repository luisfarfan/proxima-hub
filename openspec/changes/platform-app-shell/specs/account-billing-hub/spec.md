## ADDED Requirements

### Requirement: Settings de cuenta centralizados en el Hub
Las secciones de **cuenta/organización** (perfil, plan/billing, seguridad/sesiones, equipo) SHALL vivir en el Hub. Las secciones de **tienda** (negocio, sedes) SHALL permanecer en `admin.proxima.pe`. Los enlaces de admin a "Mi cuenta/Plan/Equipo/Seguridad" MUST apuntar al Hub.

#### Scenario: Cuenta en el Hub, tienda en admin
- **WHEN** el usuario abre "Mi cuenta" o "Plan" desde admin
- **THEN** es llevado a `app.proxima.pe/cuenta` (o `/plan`)
- **WHEN** abre "Negocio" o "Sedes"
- **THEN** permanece en `admin.proxima.pe`

### Requirement: Cambio de contraseña y sesiones desde el Hub
El Hub SHALL permitir cambiar contraseña (`POST /auth/change-password`) y ver/cerrar sesiones activas desde `/seguridad`.

#### Scenario: Cambiar contraseña
- **WHEN** el usuario cambia su contraseña en `/seguridad` o `/cuenta`
- **THEN** se invoca `POST /auth/change-password` y se confirma el cambio

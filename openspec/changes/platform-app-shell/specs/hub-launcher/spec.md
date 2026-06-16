## ADDED Requirements

### Requirement: Home del Hub como launcher
El home de `app.proxima.pe` SHALL ser el destino post-login y MUST contener: barra superior (marca + selector de negocio + cuenta), un saludo, el app-switcher, el checklist de onboarding y la card de plan/uso. El diseño MUST ser claro, plano y editorial (sin gradientes/glow/glass) y pasar AXE sin violaciones.

#### Scenario: Aterrizaje tras login
- **WHEN** un usuario con sesión y un negocio entra al Hub
- **THEN** ve el home con su negocio activo, el app-switcher y el checklist
- **THEN** un audit AXE (WCAG AA) reporta 0 violaciones

### Requirement: App-switcher con gating por entitlements
El app-switcher SHALL listar los productos (Panel, Caja, Tienda Web, Intelligence, App) con sus URLs desde runtime config. Los productos no incluidos en las entitlements del plan MUST mostrarse como add-on (badge) y su acción lleva a activar/mejorar, no a abrir. Cada link de un producto incluido MUST entrar con la sesión vigente (cookie SSO), sin re-login.

#### Scenario: FREE muestra Tienda Web e Intelligence como add-on
- **WHEN** un negocio en plan FREE ve el app-switcher
- **THEN** Panel/Caja/App se muestran abribles
- **THEN** Tienda Web e Intelligence se muestran con badge de add-on

#### Scenario: Abrir un producto no pide login
- **WHEN** el usuario abre "Panel" desde el switcher
- **THEN** llega a `admin.proxima.pe` autenticado por la cookie, sin formulario de login

### Requirement: Checklist y plan en el home
El home SHALL mostrar el checklist de onboarding desde `GET /admin/business/status` (progreso, ítems, próxima acción) y una card de plan con uso vs cuotas desde billing, con un CTA "Salir en vivo" hacia el paywall.

#### Scenario: Checklist refleja el estado del backend
- **WHEN** el backend reporta 1 de 4 ítems completados
- **THEN** el home muestra progreso 1/4 y los ítems pendientes accionables

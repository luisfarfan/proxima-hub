import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { tokenGuard } from './core/guards/token.guard';
import { businessGuard } from './core/guards/business.guard';

export const routes: Routes = [
  // ── Hub shell: authenticated + business context required ──────────────────
  {
    path: '',
    canActivate: [authGuard, businessGuard],
    loadComponent: () =>
      import('./features/hub/shell/hub-shell.component').then((m) => m.HubShellComponent),
    children: [
      // Hub home
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/hub/home/home.component').then((m) => m.HomeComponent),
      },
      // Account pages (shared nav + router-outlet)
      {
        path: '',
        loadComponent: () =>
          import('./features/hub/account/account-shell.component').then(
            (m) => m.AccountShellComponent,
          ),
        children: [
          {
            path: 'cuenta',
            loadComponent: () =>
              import('./features/hub/account/cuenta-page.component').then(
                (m) => m.CuentaPageComponent,
              ),
          },
          {
            path: 'plan',
            loadComponent: () =>
              import('./features/hub/account/plan-page.component').then(
                (m) => m.PlanPageComponent,
              ),
          },
          {
            path: 'seguridad',
            loadComponent: () =>
              import('./features/hub/account/seguridad-page.component').then(
                (m) => m.SeguridadPageComponent,
              ),
          },
          {
            path: 'equipo',
            loadComponent: () =>
              import('./features/hub/account/equipo-page.component').then(
                (m) => m.EquipoPageComponent,
              ),
          },
        ],
      },
    ],
  },

  // ── Identity: guest-only pages ────────────────────────────────────────────
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/identity/login/login-page.component').then(
        (m) => m.LoginPageComponent,
      ),
  },
  {
    path: 'registro',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/identity/registro/registro-page.component').then(
        (m) => m.RegistroPageComponent,
      ),
  },
  {
    path: 'recuperar',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/identity/forgot-password-page.component').then(
        (m) => m.ForgotPasswordPageComponent,
      ),
  },

  // ── Identity: token-in-link pages (no auth required) ─────────────────────
  {
    path: 'restablecer',
    data: { mode: 'reset' },
    loadComponent: () =>
      import('./features/identity/set-password-page.component').then(
        (m) => m.SetPasswordPageComponent,
      ),
  },
  {
    path: 'activar',
    data: { mode: 'setup' },
    loadComponent: () =>
      import('./features/identity/set-password-page.component').then(
        (m) => m.SetPasswordPageComponent,
      ),
  },
  {
    path: 'verificar',
    loadComponent: () =>
      import('./features/identity/verify-email-page.component').then(
        (m) => m.VerifyEmailPageComponent,
      ),
  },

  // ── Business selection (has tokens but no business yet) ───────────────────
  {
    path: 'elegir-negocio',
    canActivate: [tokenGuard],
    loadComponent: () =>
      import('./features/identity/select-business/select-business-page.component').then(
        (m) => m.SelectBusinessPageComponent,
      ),
  },

  // ── Fallback ──────────────────────────────────────────────────────────────
  {
    path: '**',
    redirectTo: '',
  },
];

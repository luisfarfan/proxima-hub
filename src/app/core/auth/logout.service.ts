import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@luisfarfan/auth';

/**
 * Cerrar sesión de verdad — contraparte de `restore-sso-session.initializer.ts`.
 *
 * `AuthService.logout()` de la lib hace dos cosas en el mismo tick:
 *
 *     this.http.post('auth/logout', {}).subscribe(...);  // sin esperar
 *     window.location.href = this.loginUrl;              // recarga inmediata
 *
 * La recarga aborta el POST antes de que llegue al servidor. Y ese POST es el
 * único que revoca la sesión y borra las cookies httpOnly de `.proxima.test`
 * (`clear_auth_cookie` / `clear_refresh_cookie` en la API).
 *
 * Mientras el Hub sólo miraba `sessionStorage` eso no se notaba: limpiar el
 * storage bastaba para "salir". Desde PPR-91 el arranque intenta
 * `POST /auth/refresh` con la cookie, así que la secuencia quedaba:
 *
 *     logout → POST abortado → recarga → la cookie sigue viva → refresh OK
 *            → guestGuard ve token y manda a '/' → businessGuard manda a
 *              /elegir-negocio
 *
 * Es decir: cerrar sesión te devolvía a elegir-negocio, con la sesión intacta.
 *
 * El arreglo es no recargar. Con `logout(false)` la lib limpia storage y
 * signals y dispara el POST igual, pero la pestaña sigue viva: el request llega,
 * el servidor revoca la sesión y el `Set-Cookie` de borrado sí se aplica. La
 * navegación a `/login` es del router, no del navegador.
 */
@Injectable({ providedIn: 'root' })
export class LogoutService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async logout(): Promise<void> {
    this.auth.logout(false);
    await this.router.navigateByUrl('/login');
  }
}

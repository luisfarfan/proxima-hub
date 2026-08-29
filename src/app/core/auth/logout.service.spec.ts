/**
 * Cerrar sesión devolvía a /elegir-negocio con la sesión intacta.
 *
 * `AuthService.logout()` dispara `POST /auth/logout` sin esperarlo y en el
 * mismo tick hace `window.location.href = '/login'`. La recarga aborta el
 * request, así que la cookie httpOnly de `.proxima.test` nunca se borra ni la
 * sesión se revoca. Desde PPR-91 el arranque la levanta con
 * `POST /auth/refresh` → guestGuard ve token → '/' → businessGuard →
 * /elegir-negocio.
 *
 * Lo que este test fija: el logout del Hub NO recarga la página (el POST tiene
 * que llegar) y navega con el router.
 */
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '@luisfarfan/auth';

import { LogoutService } from './logout.service';

describe('LogoutService', () => {
  let libLogout: ReturnType<typeof vi.fn>;
  let navigateByUrl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    libLogout = vi.fn();
    navigateByUrl = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { logout: libLogout } },
        { provide: Router, useValue: { navigateByUrl } },
      ],
    });
  });

  it('no deja que la lib recargue: el POST /auth/logout tiene que llegar', async () => {
    await TestBed.inject(LogoutService).logout();

    expect(libLogout).toHaveBeenCalledWith(false);
  });

  it('lleva al login por el router, no por window.location', async () => {
    await TestBed.inject(LogoutService).logout();

    expect(navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('limpia la sesión antes de navegar — el guard de /login mira el token', async () => {
    const orden: string[] = [];
    libLogout.mockImplementation(() => orden.push('logout'));
    navigateByUrl.mockImplementation(() => {
      orden.push('navigate');
      return Promise.resolve(true);
    });

    await TestBed.inject(LogoutService).logout();

    expect(orden).toEqual(['logout', 'navigate']);
  });
});

import {
  ApplicationConfig,
  APP_INITIALIZER,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { proximaAuraPreset } from './theme/proxima-aura-preset';
import { RuntimeConfigService } from './core/config/runtime-config.service';
import { loadRuntimeConfigInitializer } from './core/config/load-runtime-config.initializer';
import { apiBaseInterceptor } from './core/http/api-base.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { loadingInterceptor } from './core/http/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideHttpClient(
      withInterceptors([apiBaseInterceptor, loadingInterceptor, errorInterceptor]),
    ),
    providePrimeNG({
      theme: {
        preset: proximaAuraPreset,
        options: {
          darkModeSelector: '.dark',
          cssLayer: {
            name: 'primeng',
            order: 'theme, base, primeng',
          },
        },
      },
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: loadRuntimeConfigInitializer,
      deps: [RuntimeConfigService],
      multi: true,
    },
  ],
};

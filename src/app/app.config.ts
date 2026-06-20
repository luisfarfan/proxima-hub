import {
  ApplicationConfig,
  APP_INITIALIZER,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';

import { routes } from './app.routes';
import { proximaAuraPreset } from './theme/proxima-aura-preset';
import { RuntimeConfigService } from './core/config/runtime-config.service';
import { loadRuntimeConfigInitializer } from './core/config/load-runtime-config.initializer';
import { loadingInterceptor } from './core/http/loading.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import {
  provideProximaAuth,
  proximaAuthInterceptors,
  PROXIMA_AUTH_API_BASE_URL,
} from '@luisfarfan/auth';

export const appConfig: ApplicationConfig = {
  providers: [
    MessageService,
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideHttpClient(
      withInterceptors([
        ...proximaAuthInterceptors,
        loadingInterceptor,
        errorInterceptor,
      ]),
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
    provideProximaAuth({
      storageKeys: {
        accessToken: 'proxima_hub_access_token',
        refreshToken: 'proxima_hub_refresh_token',
        isSuperAdmin: 'proxima_hub_is_super_admin',
        selectedBusinessId: 'selected_business_id',
      },
    }),
    {
      provide: PROXIMA_AUTH_API_BASE_URL,
      useFactory: (runtime: RuntimeConfigService) => runtime.requireConfig().apiV1BaseUrl,
      deps: [RuntimeConfigService],
    },
  ],
};

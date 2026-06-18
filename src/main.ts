import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// es-PE locale data — required for the `date:…:'es-PE'` pipes (plan dates, payment history).
registerLocaleData(localeEsPe);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

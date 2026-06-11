import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AUTH_CONFIG, ZENTRO_THEME, jwtInterceptor } from '@zentro/shared';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    // @angular/animations nao esta instalado no workspace; PrimeNG 21 usa
    // animacoes CSS e nao depende de provideAnimationsAsync().
    providePrimeNG({ theme: ZENTRO_THEME }),
    { provide: AUTH_CONFIG, useValue: { storageKey: 'zentro_customer', loginUrl: '/conta' } },
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    MessageService,
  ],
};

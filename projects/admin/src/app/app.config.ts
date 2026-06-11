import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AUTH_CONFIG, ZENTRO_THEME, jwtInterceptor } from '@zentro/shared';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';

registerLocaleData(localePt, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    // PrimeNG 18+ usa animacoes CSS; @angular/animations nao esta instalado no workspace,
    // entao provideAnimationsAsync() nao e necessario (e quebraria o bundle).
    providePrimeNG({ theme: ZENTRO_THEME }),
    { provide: AUTH_CONFIG, useValue: { storageKey: 'zentro_admin', loginUrl: '/login' } },
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    MessageService,
    ConfirmationService,
  ],
};

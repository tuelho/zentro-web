import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

/** Anexa o Bearer token e, em 401, encerra a sessao e volta para o login. */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // nao anexa o token em URLs externas (ViaCEP, Nominatim, etc.)
  const external = /^https?:\/\//i.test(req.url);
  const token = auth.token();
  const request = token && !external
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && auth.isLoggedIn()) {
        auth.logout();
        router.navigateByUrl(auth.loginUrl);
      }
      return throwError(() => error);
    }),
  );
};

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@zentro/shared';

/** Exige sessao ativa; senao manda para /login. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.parseUrl('/login');
};

/** Rotas do lojista: admin de plataforma e redirecionado para /plataforma. */
export const lojistaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.session()?.role === 'PLATFORM_ADMIN' ? router.parseUrl('/plataforma') : true;
};

/** Rotas da plataforma: somente PLATFORM_ADMIN. */
export const platformGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.session()?.role === 'PLATFORM_ADMIN' ? true : router.parseUrl('/dashboard');
};

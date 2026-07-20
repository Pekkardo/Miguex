import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Deja pasar sólo a ADMIN. Sin sesión → login; con sesión pero VIEWER → home. */
export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = await auth.me();
  if (!user) {
    return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
  }
  if (user.role !== 'ADMIN') {
    return router.createUrlTree(['/']);
  }
  return true;
};

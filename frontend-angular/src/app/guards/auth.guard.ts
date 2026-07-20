import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Deja pasar sólo con sesión válida; si no, manda al login guardando el destino. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = await auth.me();
  if (user) return true;

  return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};

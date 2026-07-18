import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Agrega withCredentials a todo (la cookie del JWT no viaja sin eso) y, ante un
 * 401, limpia la sesión y manda al login: cubre el caso del token que vence
 * mientras el tablero está abierto.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const withCreds = req.clone({ withCredentials: true });

  return next(withCreds).pipe(
    catchError((err: HttpErrorResponse) => {
      // El propio /me responde 401 cuando no hay sesión: ahí no hay que redirigir,
      // de eso se encarga el guard.
      const isAuthProbe = req.url.includes('/api/auth/');
      if (err.status === 401 && !isAuthProbe) {
        auth.clear();
        router.navigate(['/login'], { queryParams: { redirect: router.url } });
      }
      return throwError(() => err);
    })
  );
};

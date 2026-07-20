import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TabVisibilityService } from '../services/tab-visibility.service';
import { PAGES } from '../pages';

/**
 * Gate autoritativo de acceso a un tablero (a diferencia del navbar, que sólo
 * oculta la opción). El ADMIN siempre pasa. Un VIEWER sólo entra si su pestaña
 * (route.data['tabId']) está habilitada; si no, se lo manda a la primera pestaña
 * que sí tenga visible, y si no hay ninguna se cierra la sesión (evita un loop de
 * redirects entre tableros todos deshabilitados).
 */
export const tabGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const tabs = inject(TabVisibilityService);
  const router = inject(Router);

  const user = await auth.me();
  if (!user) {
    return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
  }
  if (user.role === 'ADMIN') return true;

  const tabId = route.data['tabId'] as string;
  await tabs.fetch();
  if (tabs.isVisible(tabId)) return true;

  const fallback = PAGES.find(p => p.id !== tabId && tabs.isVisible(p.id));
  if (fallback) return router.createUrlTree(['/' + fallback.path]);

  await auth.logout();
  return router.createUrlTree(['/login'], { queryParams: { blocked: '1' } });
};

/**
 * Registro de tableros: única fuente de verdad para el router (app.routes.ts) y
 * para el selector de la barra superior (app.component.ts). Agregar un tablero
 * nuevo es agregar una entrada acá.
 */
export interface PageDef {
  /** Clave estable de negocio, independiente del path. Debe coincidir exactamente
   *  con TabVisibility.KNOWN_KEYS en el backend (usada para la visibilidad por rol). */
  id: string;
  /** Path de la ruta, sin barra inicial. '' es el tablero por defecto. */
  path: string;
  /** Texto de la opción en el selector y título de la barra. */
  label: string;
  /** Variante de color de la barra superior (regla .topbar[data-theme=...] en styles.css). */
  theme?: 'wad' | 'egg' | 'cruce' | 'datos';
  /** Emoji opcional junto al logo. */
  icon?: string;
}

export const PAGES: PageDef[] = [
  { id: 'dashboard0800', path: '',      label: 'Tablero 0800 — Admisiones' },
  { id: 'wad',           path: 'wad',   label: 'Tablero WhatsApp — Admisiones', theme: 'wad', icon: '💬' },
  { id: 'egg',           path: 'egg',   label: 'Chats WhatsApp (Egg)',          theme: 'egg', icon: '💬' },
  { id: 'cruce',         path: 'cruce', label: 'Cruce Matrículas x Ventas',     theme: 'cruce' },
  { id: 'datos',         path: 'datos', label: 'Datos — 0800 · Leads · Chats',  theme: 'datos', icon: '📊' }
];

/**
 * Resuelve la página activa a partir de la URL del router. Compara el primer
 * segmento exacto en vez de usar includes(): con cuatro rutas, un includes('wad')
 * matchearía cualquier path que contenga esas letras.
 */
export function pageForUrl(url: string): PageDef {
  const segment = url.split('?')[0].split('#')[0].replace(/^\/+/, '').split('/')[0];
  return PAGES.find(p => p.path === segment) ?? PAGES[0];
}

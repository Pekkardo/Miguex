export interface WadRow {
  dk: string;    // fecha YYYY-MM-DD
  dia: string;   // Lunes, Martes, ...
  h: number;     // hora
  ec: string;    // Estado Chat: Cerrado / Abierto
  res: string;   // Resolución
  mat: number;   // 1 matriculado, 0 no
  ag: string;    // agente
}

export interface WadFilters {
  desde: string;
  hasta: string;
  hora: string;
  ag: string;
  estado: string;
  dia: string;
  mat: string;   // '' | '1' | '0'
}

export interface WadUploadResult {
  chats: number;
  cerrados: number;
  matriculados: number;
}

export const DIA_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function emptyWadFilters(): WadFilters {
  return { desde: '', hasta: '', hora: '', ag: '', estado: '', dia: '', mat: '' };
}

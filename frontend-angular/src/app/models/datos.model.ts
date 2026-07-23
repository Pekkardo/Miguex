/** Modelo del tablero "Datos" (0800 · Leads · Chats). */

export type Canal = '0800' | 'Leads' | 'Chats';
/** Slug que espera el backend en /api/datos/upload. */
export type CanalSlug = '0800' | 'leads' | 'chats';

/** Fila normalizada tal como la sirve el backend (sin canal: viene por lista). */
export interface DatosDto {
  fecha: string;   // ISO yyyy-MM-dd
  semana: string;
  turno: string;
  dia: string;
}

/** Respuesta de GET /api/datos/data: una lista por canal. */
export interface DatosBundle {
  c0800: DatosDto[];
  leads: DatosDto[];
  chats: DatosDto[];
}

/** Fila unificada en el front, ya etiquetada con su canal. */
export interface DatosRow extends DatosDto {
  canal: Canal;
}

export interface UploadResult {
  canal: string;
  rows: number;
}

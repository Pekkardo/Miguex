/**
 * Fila de chat Egg. Las claves llegan con espacios y acentos porque EggDto las
 * serializa así (@JsonProperty) para mantener el formato del tablero original.
 */
export interface EggRow {
  'Fecha real': string;
  'Dia': number | null;
  'Mes': number | null;
  'Telefono': number | null;
  'Repetidos': string;
  'Resolucion V2': string;
  'salientes': string;
  'Estado': string;
  'Canal': string;
  'Usuario': string;
  'Campaña': string;
  'SubCategoria': string;
}

export interface EggFilters {
  mes: string;
  dia: string;
  res: string;
  saliente: string;
  rep: string;
  search: string;
}

export interface EggUploadResult {
  chats: number;
  respondidos: number;
  noRespondidos: number;
}

export function emptyEggFilters(): EggFilters {
  return { mes: '', dia: '', res: '', saliente: '', rep: '', search: '' };
}

export const MESES: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
  7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
};

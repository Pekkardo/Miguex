export interface EjecutivoRow {
  dk: string;     // fecha real (YYYY-MM-DD)
  dia: number;
  mes: number;
  tel: number;    // telefono
  rep: string;    // repetidos: Único / Duplicado
  res: string;    // resolucion v2
  sal: string;    // salientes: SI / NO
  est: string;    // estado del chat
  can: string;    // canal
  usr: string;    // usuario
  camp: string;   // campaña
  sub: string;    // subcategoria
}

export interface EjecutivoFilters {
  mes: string;
  dia: string;
  res: string;
  sal: string;   // '' | 'SI' | 'NO'
  rep: string;   // '' | 'Único' | 'Duplicado'
  search: string;
}

export interface EjecutivoUploadResult {
  total: number;
  respondidos: number;
  noRespondidos: number;
  resolucionesDistintas: number;
}

export function emptyEjecutivoFilters(): EjecutivoFilters {
  return { mes: '', dia: '', res: '', sal: '', rep: '', search: '' };
}

export interface NominaRow {
  u: string;
  vendedor: string;
  lider: string;
  campania: string;
  estado: string;
}

export interface VentaRow {
  neotel: string;
  mes: string;
  semana: string;
  dia: string;
  carrera: string;
}

export interface CruceData {
  nomina: NominaRow[];
  ventas: VentaRow[];
}

export interface CruceUploadResult {
  tipo: 'nomina' | 'ventas';
  filas: number;
}

/** Claves de los seis filtros multi-selección. */
export type FacetKey = 'mes' | 'semana' | 'dia' | 'lider' | 'campania' | 'estado';

export type CruceFilters = Record<FacetKey, string[]>;

export function emptyCruceFilters(): CruceFilters {
  return { mes: [], semana: [], dia: [], lider: [], campania: [], estado: [] };
}

/** Fila del cruce: un vendedor de la nómina con sus matrículas del período filtrado. */
export interface CruceRow {
  u: string;
  vendedor: string;
  lider: string;
  campania: string;
  estado: string;
  cantidad: number;
  carreras: Record<string, number>;
}

export const MES_ORDER = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
                          'agosto', 'septiembre', 'setiembre', 'octubre', 'noviembre', 'diciembre'];

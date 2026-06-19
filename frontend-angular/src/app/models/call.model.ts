export interface CallRow {
  conn: boolean;
  h: number | null;
  dateKey: string;
  dow: number | null;
  mat: boolean;
  agent: string;
  dur: number;
  tipo: string;
}

export interface Filters {
  desde: string;
  hasta: string;
  hora: string;   // '' o '9'..'20'
  agente: string;
  dia: string;    // '' o '0'..'6' (0=Dom)
  mat: string;    // '' | '1' | '0'
}

export interface UploadResult {
  calls: number;
  connected: number;
  matriculas: number;
}

export interface AgentStat {
  name: string;
  calls: number;
  mat: number;
  dur: number;
}

export const DOW_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function emptyFilters(): Filters {
  return { desde: '', hasta: '', hora: '', agente: '', dia: '', mat: '' };
}

export function fmtSec(s: number): string {
  const n = Math.trunc(s) || 0;
  return n < 60 ? n + 's' : Math.floor(n / 60) + 'm ' + (n % 60) + 's';
}

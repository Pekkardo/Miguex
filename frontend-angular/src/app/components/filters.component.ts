import { Component, computed, inject } from '@angular/core';
import { DashboardService } from '../services/dashboard.service';
import { DOW_NAMES, Filters } from '../models/call.model';

@Component({
  selector: 'app-filters',
  standalone: true,
  template: `
    <div class="fbar">
      <span class="fbar-title">Filtros</span>

      <div class="filter-group">
        <label>Desde</label>
        <input type="date" [value]="f().desde" (change)="set('desde', $event)">
      </div>
      <div class="filter-group">
        <label>Hasta</label>
        <input type="date" [value]="f().hasta" (change)="set('hasta', $event)">
      </div>

      <div class="filter-group">
        <label>Hora</label>
        <select [value]="f().hora" (change)="set('hora', $event)">
          <option value="">Todas</option>
          @for (h of horas; track h) {
            <option [value]="h">{{ h }}:00</option>
          }
        </select>
      </div>

      <div class="filter-group">
        <label>Agente</label>
        <select [value]="f().agente" (change)="set('agente', $event)">
          <option value="">Todos</option>
          @for (a of svc.agents(); track a) {
            <option [value]="a">{{ a }}</option>
          }
        </select>
      </div>

      <div class="filter-group">
        <label>Día</label>
        <div class="chip-row">
          @for (d of dias; track d.val) {
            <span class="chip" [class.active]="f().dia === d.val"
                  (click)="svc.patchFilters({ dia: d.val })">{{ d.label }}</span>
          }
        </div>
      </div>

      <div class="filter-group">
        <label>Matric.</label>
        <div class="chip-row">
          @for (m of mats; track m.val) {
            <span class="chip" [class.active]="f().mat === m.val"
                  (click)="svc.patchFilters({ mat: m.val })">{{ m.label }}</span>
          }
        </div>
      </div>

      <button class="reset-btn" (click)="svc.resetFilters()">✕ Limpiar</button>
    </div>

    @if (parts().length && svc.allRows().length) {
      <div class="filter-summary" style="margin-top:8px">
        Mostrando <strong>{{ svc.filteredConnected().length }} llamadas</strong>
        de {{ svc.filtered().length }} totales · Filtros: {{ parts().join(' · ') }}
      </div>
    }
  `
})
export class FiltersComponent {
  svc = inject(DashboardService);
  f = this.svc.filters;

  horas = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  dias = [
    { val: '', label: 'Todos' },
    { val: '1', label: 'Lun' },
    { val: '2', label: 'Mar' },
    { val: '3', label: 'Mié' },
    { val: '4', label: 'Jue' },
    { val: '5', label: 'Vie' },
    { val: '6', label: 'Sáb' }
  ];
  mats = [
    { val: '', label: 'Todos' },
    { val: '1', label: 'Solo mat.' },
    { val: '0', label: 'No mat.' }
  ];

  set(key: keyof Filters, e: Event) {
    const value = (e.target as HTMLInputElement | HTMLSelectElement).value;
    this.svc.patchFilters({ [key]: value });
  }

  parts = computed<string[]>(() => {
    const f = this.f();
    const out: string[] = [];
    if (f.desde || f.hasta) {
      const d = f.desde ? f.desde.slice(8, 10) + '/' + f.desde.slice(5, 7) : 'inicio';
      const h = f.hasta ? f.hasta.slice(8, 10) + '/' + f.hasta.slice(5, 7) : 'hoy';
      out.push(`${d} → ${h}`);
    }
    if (f.hora !== '') out.push(`Hora ${f.hora}:00`);
    if (f.agente) out.push(f.agente);
    if (f.dia !== '') out.push(DOW_NAMES[+f.dia]);
    if (f.mat === '1') out.push('Solo matriculados');
    if (f.mat === '0') out.push('No matriculados');
    return out;
  });
}

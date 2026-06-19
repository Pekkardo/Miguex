import { Component, inject, signal } from '@angular/core';
import { DashboardService } from '../services/dashboard.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  template: `
    <div class="upload" [class.drag]="drag()" [class.done]="done()"
         (click)="fileInput.click()"
         (dragover)="onDragOver($event)"
         (dragleave)="drag.set(false)"
         (drop)="onDrop($event)">
      @if (!done()) {
        <div class="icon">📊</div>
        <p><strong>Subir Excel del día</strong> — hacé clic o arrastrá acá</p>
        <p style="font-size:11px;margin-top:2px">Formato: EJECUTIVO 0800 *.xlsx</p>
      } @else {
        <p class="fn">{{ status() }}</p>
        <p style="font-size:11px;margin-top:2px;color:var(--muted)">Hacé clic para cargar otro archivo</p>
      }
    </div>
    <input #fileInput type="file" accept=".xlsx,.xls" hidden (change)="onPick($event)">
  `
})
export class UploadComponent {
  private svc = inject(DashboardService);
  drag = signal(false);
  done = signal(false);
  status = signal('');

  onDragOver(e: DragEvent) { e.preventDefault(); this.drag.set(true); }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.drag.set(false);
    this.loadFile(e.dataTransfer?.files?.[0]);
  }

  onPick(e: Event) {
    const input = e.target as HTMLInputElement;
    this.loadFile(input.files?.[0]);
    input.value = '';
  }

  async loadFile(file?: File | null) {
    if (!file) return;
    this.done.set(true);
    this.status.set('⏳ Procesando ' + file.name + '…');
    try {
      const r = await this.svc.upload(file);
      this.svc.fileName.set(file.name);
      await this.svc.fetchData();
      this.status.set(`✓ ${file.name} — ${r.calls} llamadas · ${r.connected} conectadas · ${r.matriculas} matrículas`);
    } catch (e: any) {
      this.done.set(false);
      alert('Error al subir: ' + (e?.error?.error || e?.message || e));
    }
  }
}

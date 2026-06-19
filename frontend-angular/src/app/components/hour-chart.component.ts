import { Component, computed, inject } from '@angular/core';
import { DashboardService } from '../services/dashboard.service';

@Component({
  selector: 'app-hour-chart',
  standalone: true,
  host: { class: 'card' },
  template: `
    <div class="ctitle">Llamadas por hora <span>{{ peakNote() }}</span></div>
    <div class="bars">
      @if (svc.filteredConnected().length) {
        @for (b of bars(); track b.h) {
          <div class="brow">
            <span class="blbl">{{ b.h }}h</span>
            <div class="btrack">
              <div class="bfill" [style.width.%]="b.w" [style.background]="b.peak ? '#185FA5' : '#85B7EB'"></div>
            </div>
            <span class="bcnt">{{ b.c }}</span>
          </div>
        }
      } @else {
        <div class="empty">Cargá un archivo</div>
      }
    </div>
  `
})
export class HourChartComponent {
  svc = inject(DashboardService);

  private model = computed(() => {
    const hm: Record<number, number> = {};
    this.svc.filteredConnected().forEach(r => {
      if (r.h != null && r.h >= 9 && r.h <= 20) hm[r.h] = (hm[r.h] || 0) + 1;
    });
    const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const max = Math.max(...hours.map(h => hm[h] || 0), 1);
    let peak = -1, peakC = -1;
    hours.forEach(h => { const c = hm[h] || 0; if (c > peakC) { peakC = c; peak = h; } });
    return {
      peak: peakC > 0 ? peak : null,
      bars: hours.map(h => ({
        h, c: hm[h] || 0, w: Math.round((hm[h] || 0) / max * 100), peak: h === peak && peakC > 0
      }))
    };
  });

  bars = computed(() => this.model().bars);
  peakNote = computed(() => { const p = this.model().peak; return p != null ? `pico ${p}h` : ''; });
}

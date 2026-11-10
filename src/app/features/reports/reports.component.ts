import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EdmsStore } from '../../core/edms.store';
import { STATUSES, today } from '../../core/models';
import { StatusComponent } from '../../shared/status.component';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-reports',
  imports: [RouterLink, StatusComponent, IconComponent],
  template: `<main class="module-page panel">
    <header class="module-heading">
      <p class="eyebrow">ОБЗОР ДОКУМЕНТООБОРОТА</p>
      <div class="section-heading">
        <h1>Отчёты</h1>
        <button class="button" (click)="exportCsv()"><app-icon name="download" />Экспорт CSV</button>
      </div>
      <p class="muted">Сводка по документам и поручениям рабочего пространства</p>
    </header>
    <div class="report-content">
      <div class="metric-grid">
        <article class="metric-card">
          <app-icon name="folder" /><span>Всего документов</span
          ><strong>{{ store.documents().length }}</strong>
        </article>
        <article class="metric-card">
          <app-icon name="clock" /><span>На согласовании</span><strong>{{ pending() }}</strong>
        </article>
        <article class="metric-card warning">
          <app-icon name="bell" /><span>Просрочено этапов</span><strong>{{ overdue() }}</strong>
        </article>
        <article class="metric-card">
          <app-icon name="check-square" /><span>Поручений в работе</span><strong>{{ activeTasks() }}</strong>
        </article>
      </div>
      <section class="report-section">
        <h2>Документы по статусам</h2>
        <p class="muted">Нажмите на статус, чтобы перейти к документам</p>
        @for (item of distribution(); track item.status) {
          <a class="report-bar-row" routerLink="/documents/center" [queryParams]="{ status: item.status }"
            ><app-status [status]="item.status" />
            <div class="report-bar-track"><span [style.width.%]="item.percent"></span></div>
            <strong>{{ item.count }}</strong
            ><span class="muted">{{ item.percent }}%</span></a
          >
        }
      </section>
      <section class="report-section">
        <h2>Исполнение поручений</h2>
        <div class="completion-progress"><span [style.width.%]="completion()"></span></div>
        <p class="muted">
          Выполнено {{ store.tasks().length - activeTasks() }} из {{ store.tasks().length }} поручений ·
          {{ completion() }}%
        </p>
      </section>
    </div>
  </main>`,
})
export class ReportsComponent {
  readonly store = inject(EdmsStore);
  readonly pending = computed(
    () => this.store.documents().filter((d) => d.status === 'На согласовании').length,
  );
  readonly overdue = computed(
    () =>
      this.store
        .documents()
        .filter(
          (d) =>
            d.deadline && d.deadline < today() && ['На согласовании', 'На подписании'].includes(d.status),
        ).length,
  );
  readonly activeTasks = computed(() => this.store.tasks().filter((t) => !t.done).length);
  readonly completion = computed(() =>
    this.store.tasks().length
      ? Math.round(((this.store.tasks().length - this.activeTasks()) / this.store.tasks().length) * 100)
      : 0,
  );
  readonly distribution = computed(() =>
    STATUSES.map((status) => {
      const count = this.store.documents().filter((d) => d.status === status).length;
      return {
        status,
        count,
        percent: Math.round((count / Math.max(1, this.store.documents().length)) * 100),
      };
    }),
  );
  exportCsv(): void {
    const csv =
      '\uFEFFСтатус;Количество;Доля\r\n' +
      this.distribution()
        .map((d) => `${d.status};${d.count};${d.percent}%`)
        .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `Отчёт_документы_${today()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}

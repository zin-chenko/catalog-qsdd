import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EdmsStore } from '../../core/edms.store';
import { formatDate, today } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-tasks',
  imports: [RouterLink, FormsModule, IconComponent],
  template: `<main class="module-page panel">
    <header class="module-heading">
      <p class="eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО</p>
      <h1>
        Контроль поручений <span class="heading-count">{{ store.tasks().length }}</span>
      </h1>
      <p class="muted">Поручения по документам и контроль сроков исполнения</p>
    </header>
    <div class="module-toolbar">
      <div class="segmented">
        <button [class.active]="filter() === 'active'" (click)="filter.set('active')">В работе</button
        ><button [class.active]="filter() === 'done'" (click)="filter.set('done')">Завершённые</button
        ><button [class.active]="filter() === 'all'" (click)="filter.set('all')">Все</button>
      </div>
      <label class="input-icon"
        ><app-icon name="search" /><input
          aria-label="Поиск поручений"
          placeholder="Найти поручение"
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
      /></label>
    </div>
    <div class="task-list">
      @for (task of tasks(); track task.id) {
        <article class="task-card" [class.completed]="task.done">
          <button
            class="task-checkbox"
            [class.checked]="task.done"
            [attr.aria-label]="(task.done ? 'Вернуть в работу: ' : 'Завершить: ') + task.title"
            (click)="complete(task.id)"
          >
            @if (task.done) {
              <app-icon name="check" />
            }
          </button>
          <div class="task-details">
            <h2>{{ task.title }}</h2>
            <p>
              <span>{{ task.assignee }}</span
              ><span class="task-deadline" [class.overdue]="!task.done && task.deadline < today"
                ><app-icon name="clock" />{{ date(task.deadline) }}</span
              >
            </p>
            <a [routerLink]="documentLink(task.documentId)"
              >Перейти к документу <app-icon name="chevron"
            /></a>
          </div>
          <span class="status" [class.green]="task.done" [class.blue]="!task.done">{{
            task.done ? 'Выполнено' : 'В работе'
          }}</span>
        </article>
      } @empty {
        <div class="empty-state">
          <app-icon name="check-square" />
          <h2>Поручений пока нет</h2>
          <p>Создайте поручение из карточки документа или ответа AI-ассистента.</p>
          <a class="button primary" routerLink="/documents/orders">К документам</a>
        </div>
      }
    </div>
  </main>`,
})
export class TasksComponent {
  readonly store = inject(EdmsStore);
  readonly filter = signal('active');
  readonly search = signal('');
  readonly date = formatDate;
  readonly today = today();
  readonly tasks = computed(() =>
    this.store
      .tasks()
      .filter(
        (t) =>
          (this.filter() === 'all' || t.done === (this.filter() === 'done')) &&
          (t.title + t.assignee).toLowerCase().includes(this.search().toLowerCase()),
      ),
  );
  documentLink(id: string): string[] {
    const doc = this.store.documents().find((d) => d.id === id);
    return ['/documents', doc?.folderId ?? 'orders', id, 'card'];
  }
  async complete(id: string): Promise<void> {
    await this.store.run(() => this.store.api.completeTask(id), 'Статус поручения обновлён');
  }
}

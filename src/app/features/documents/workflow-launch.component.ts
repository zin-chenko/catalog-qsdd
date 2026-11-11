import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EdmsStore } from '../../core/edms.store';
import { EdmsDocument } from '../../core/models';
import { DialogComponent } from '../../shared/dialog.component';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-workflow-launch',
  imports: [FormsModule, RouterLink, DialogComponent, IconComponent],
  template: `
    <button class="button primary launch-button" (click)="open()">
      <app-icon name="plus" />Запустить согласование
    </button>
    @if (opened()) {
      <app-dialog title="Запуск согласования" (closed)="opened.set(false)">
        <form class="dialog-body" (ngSubmit)="previewLaunch()">
          <div class="launch-document">
            <strong>{{ document().title }}</strong>
            <p class="muted">№ {{ document().number }} · Версия {{ document().versions[0].number }}</p>
          </div>
          @if (store.workflowRoutes().length) {
            <label
              >Маршрут согласования<select
                name="workflowRoute"
                [ngModel]="selectedId()"
                (ngModelChange)="selectRoute($event)"
                required
              >
                <option value="" disabled>Выберите маршрут</option>
                @for (route of store.workflowRoutes(); track route.id) {
                  <option [value]="route.id">{{ route.name }}</option>
                }
              </select></label
            >
            @if (selectedRoute(); as route) {
              <section aria-label="Шаги выбранного маршрута">
                <h3>Шаги маршрута · {{ route.steps.length }}</h3>
                <ol class="launch-steps">
                  @for (step of route.steps; track step.id) {
                    <li>
                      <strong>{{ step.name }}</strong
                      ><span>{{ step.assignee }}</span
                      ><span
                        class="status"
                        [class.blue]="step.type === 'approval'"
                        [class.green]="step.type === 'signing'"
                        >{{ step.type === 'signing' ? 'Подписание' : 'Согласование' }}</span
                      >
                    </li>
                  }
                </ol>
              </section>
            }
            <p class="muted">Предпросмотр запуска. Отправка на согласование пока недоступна.</p>
            @if (previewed()) {
              <p class="launch-notice" role="status">
                Выбран маршрут «{{ selectedRoute()?.name }}». Это демонстрация: согласование не запущено.
              </p>
            }
          } @else {
            <div class="launch-empty">
              <h3>Нет доступных маршрутов</h3>
              <p class="muted">Сначала создайте маршрут с шагами согласования и подписания.</p>
              <a class="button" routerLink="/routes">Создать маршрут</a>
            </div>
          }
          <div class="dialog-actions">
            <button type="button" class="button" (click)="opened.set(false)">Закрыть</button
            ><button type="submit" class="button primary" [disabled]="!selectedRoute()?.steps?.length">
              Запустить согласование
            </button>
          </div>
        </form>
      </app-dialog>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        margin-top: 14px;
      }
      .launch-document {
        overflow-wrap: anywhere;
      }
      .launch-document p {
        margin-top: 6px;
      }
      .launch-steps {
        display: grid;
        gap: 14px;
        padding-left: 24px;
        margin: 16px 0 0;
      }
      .launch-steps li {
        padding-left: 5px;
        overflow-wrap: anywhere;
      }
      .launch-steps strong,
      .launch-steps li > span {
        display: block;
        margin-bottom: 5px;
      }
      .launch-steps li > .status {
        display: inline-block;
      }
      .launch-empty {
        display: grid;
        gap: 12px;
        justify-items: start;
      }
      .launch-notice {
        padding: 12px;
        border-radius: 6px;
        background: var(--blue-light);
        color: var(--blue);
      }
    `,
  ],
})
export class WorkflowLaunchComponent {
  readonly store = inject(EdmsStore);
  readonly document = input.required<EdmsDocument>();
  readonly opened = signal(false);
  readonly selectedId = signal('');
  readonly previewed = signal(false);
  readonly selectedRoute = computed(() =>
    this.store.workflowRoutes().find((r) => r.id === this.selectedId()),
  );
  open(): void {
    this.selectedId.set('');
    this.previewed.set(false);
    this.opened.set(true);
  }
  selectRoute(id: string): void {
    this.selectedId.set(id);
    this.previewed.set(false);
  }
  previewLaunch(): void {
    if (this.selectedRoute()?.steps.length) this.previewed.set(true);
  }
}

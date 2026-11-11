import { Component, computed, input } from '@angular/core';
import { documentApprovals } from '../../core/document-approvals';
import { EdmsDocument, formatDate } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-document-approvals',
  imports: [IconComponent],
  template: `
    <section class="approvals-content">
      <div class="section-heading">
        <h2>
          Согласования <span class="heading-count">{{ approvals().length }}</span>
        </h2>
      </div>
      <p class="muted approvals-description">
        Каждое согласование — отдельный запуск по выбранному маршруту. Документ может проходить один или
        разные маршруты несколько раз.
      </p>
      <div class="approvals-list">
        @for (approval of approvals(); track approval.id) {
          <article class="approval-card">
            <header class="approval-heading">
              <div>
                <span class="approval-label">СОГЛАСОВАНИЕ {{ approvals().length - $index }}</span>
                <h3>{{ approval.routeName }}</h3>
              </div>
              <span
                class="status"
                [class.blue]="approval.status === 'На согласовании' || approval.status === 'На подписании'"
                [class.green]="approval.status === 'Согласовано'"
                [class.red]="approval.status === 'Отклонено'"
                [class.gray]="approval.status === 'Отозвано'"
                >{{ approval.status }}</span
              >
            </header>
            <dl class="approval-meta">
              <div>
                <dt>Редакция документа</dt>
                <dd>Версия {{ approval.version }}</dd>
              </div>
              <div>
                <dt>Инициатор</dt>
                <dd>{{ approval.initiator }}</dd>
              </div>
              <div>
                <dt>Начало</dt>
                <dd>{{ date(approval.startedAt) }}</dd>
              </div>
              @if (approval.finishedAt) {
                <div>
                  <dt>Завершение</dt>
                  <dd>{{ date(approval.finishedAt) }}</dd>
                </div>
              }
            </dl>
            <details>
              <summary>Шаги согласования · {{ approval.steps.length }}</summary>
              <ol class="timeline">
                @for (step of approval.steps; track step.id) {
                  <li [class]="'timeline-step ' + step.state">
                    <span class="step-marker">
                      @if (step.state === 'done') {
                        <app-icon name="check" />
                      } @else {
                        {{ $index + 1 }}
                      }
                    </span>
                    <div class="step-content">
                      <h3>
                        {{ $index + 1 }}. {{ step.title }}
                        @if (step.state === 'current') {
                          <span> — текущий этап</span>
                        }
                        @if (step.parallel) {
                          <small> · параллельно</small>
                        }
                      </h3>
                      @for (participant of step.participants; track $index) {
                        <div class="participant" [class.participant-card]="step.parallel">
                          <div class="participant-line">
                            <span>{{ participant.name }}</span
                            ><span class="decision-text"
                              >{{ participant.decision }}
                              @if (participant.date) {
                                · {{ participant.date }}
                              }
                            </span>
                          </div>
                          @if (participant.comment) {
                            <p class="participant-comment">«{{ participant.comment }}»</p>
                          }
                        </div>
                      }
                    </div>
                  </li>
                }
              </ol>
            </details>
          </article>
        } @empty {
          <div class="empty-state">
            <app-icon name="check-square" />
            <h3>Согласований пока нет</h3>
            <p>Для нового согласования нажмите «Запустить согласование» и выберите маршрут.</p>
          </div>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .approvals-content {
        padding: 22px 26px;
      }
      .approvals-description {
        margin: 12px 0 20px;
        line-height: 1.6;
      }
      .approvals-list {
        display: grid;
        gap: 16px;
      }
      .approval-card {
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 18px;
        min-width: 0;
      }
      .approval-heading {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        flex-wrap: wrap;
      }
      .approval-heading h3 {
        margin-top: 7px;
        overflow-wrap: anywhere;
      }
      .approval-label {
        font-size: 9px;
        letter-spacing: 1px;
        color: var(--muted);
      }
      .approval-meta {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 14px;
        margin: 20px 0;
      }
      .approval-meta dt {
        color: var(--muted);
        font-size: 10px;
        margin-bottom: 6px;
      }
      .approval-meta dd {
        margin: 0;
        font-size: 12px;
        overflow-wrap: anywhere;
      }
      summary {
        cursor: pointer;
        color: var(--blue);
        font-weight: 600;
        padding: 10px 0;
      }
      summary:focus-visible {
        outline: 2px solid var(--blue);
        outline-offset: 3px;
      }
      .timeline {
        margin-top: 14px;
      }
      @media (max-width: 600px) {
        .approvals-content {
          padding: 16px;
        }
        .approval-card {
          padding: 14px;
        }
      }
    `,
  ],
})
export class DocumentApprovalsComponent {
  readonly document = input.required<EdmsDocument>();
  readonly approvals = computed(() => documentApprovals(this.document()));
  readonly date = formatDate;
}

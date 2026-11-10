import { Component, input } from '@angular/core';
import { DocumentStatus } from '../core/models';
@Component({
  selector: 'app-status',
  template: `<span class="status" [class]="'status ' + classes[status()]">{{ status() }}</span>`,
})
export class StatusComponent {
  readonly status = input.required<DocumentStatus>();
  readonly classes: Record<DocumentStatus, string> = {
    'На согласовании': 'orange',
    Зарегистрирован: 'green',
    'На подписании': 'blue',
    Отклонён: 'red',
    Черновик: 'gray',
  };
}

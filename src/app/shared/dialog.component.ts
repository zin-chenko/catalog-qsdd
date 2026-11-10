import { AfterViewInit, Component, ElementRef, input, output, viewChild } from '@angular/core';
import { IconComponent } from './icon.component';
@Component({
  selector: 'app-dialog',
  imports: [IconComponent],
  template: `<dialog #dialog (cancel)="closed.emit()" (click)="onBackdrop($event)">
    <header class="dialog-header">
      <h2>{{ title() }}</h2>
      <button type="button" class="icon-button" aria-label="Закрыть диалог" (click)="closed.emit()">
        <app-icon name="close" />
      </button>
    </header>
    <ng-content />
  </dialog>`,
  styles: [
    `
      dialog {
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 0;
        max-width: 720px;
        width: calc(100vw - 40px);
        max-height: 88vh;
        box-shadow: 0 24px 80px #13274833;
        color: var(--text);
      }
      dialog::backdrop {
        background: #14213965;
        backdrop-filter: blur(2px);
      }
      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid var(--line);
        position: sticky;
        top: 0;
        background: white;
        z-index: 2;
      }
      h2 {
        font-size: 18px;
        margin: 0;
      }
    `,
  ],
})
export class DialogComponent implements AfterViewInit {
  readonly title = input.required<string>();
  readonly closed = output<void>();
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  ngAfterViewInit(): void {
    this.dialog().nativeElement.showModal();
  }
  onBackdrop(event: MouseEvent): void {
    if (event.target !== this.dialog().nativeElement) return;
    const rect = this.dialog().nativeElement.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      this.closed.emit();
  }
}

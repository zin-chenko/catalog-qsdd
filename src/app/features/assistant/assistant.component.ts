import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EdmsStore } from '../../core/edms.store';
import { AssistantContext, AssistantMessage, AssistantReference } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-assistant',
  imports: [FormsModule, IconComponent],
  templateUrl: './assistant.component.html',
})
export class AssistantComponent {
  readonly store = inject(EdmsStore);
  readonly context = input.required<AssistantContext>();
  readonly label = input.required<string>();
  readonly openReference = output<AssistantReference>();
  readonly createTask = output<void>();
  readonly messages = signal<AssistantMessage[]>([]);
  readonly pending = signal(false);
  readonly quickActions = computed(() =>
    this.context().documentId
      ? ['Кратко пересказать', 'Ключевые сроки', 'Кто исполнители']
      : ['Что ждёт моего решения', 'Просроченные', 'Найти по смыслу'],
  );
  question = '';
  private generation = 0;
  constructor() {
    effect(() => {
      const ctx = this.context();
      this.generation++;
      this.pending.set(false);
      this.messages.set([]);
      this.question = '';
      void this.seedConversation(ctx, this.generation);
    });
  }
  private async seedConversation(ctx: AssistantContext, generation: number): Promise<void> {
    const question = ctx.documentId
      ? 'Кратко перескажи документ'
      : 'Какие документы ждут моего согласования?';
    try {
      const answer = await this.store.api.ask(ctx, question);
      const messages: AssistantMessage[] = [
        { id: crypto.randomUUID(), role: 'user', text: question },
        answer,
      ];
      const followup =
        ctx.documentId === 'order-214'
          ? 'До какого числа нужно ознакомить мой отдел?'
          : !ctx.documentId && ctx.folderId === 'orders'
            ? 'Найди приказы про командировки за 2024–2026'
            : null;
      if (followup)
        messages.push(
          { id: crypto.randomUUID(), role: 'user', text: followup },
          await this.store.api.ask(ctx, followup),
        );
      if (generation === this.generation) this.messages.set(messages);
    } catch {
      if (generation === this.generation) this.messages.set([]);
    }
  }
  reset(): void {
    this.generation++;
    this.messages.set([]);
    this.question = '';
    this.pending.set(false);
  }
  async send(question = this.question): Promise<void> {
    if (!question.trim() || this.pending()) return;
    const generation = this.generation;
    this.question = '';
    this.pending.set(true);
    this.messages.update((messages) => [
      ...messages,
      { id: crypto.randomUUID(), role: 'user', text: question.trim() },
    ]);
    try {
      const answer = await this.store.api.ask(this.context(), question);
      if (generation === this.generation) this.messages.update((messages) => [...messages, answer]);
    } catch {
      if (generation === this.generation)
        this.messages.update((messages) => [
          ...messages,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: 'Не удалось получить ответ. Попробуйте ещё раз.',
          },
        ]);
    } finally {
      if (generation === this.generation) {
        this.pending.set(false);
        setTimeout(() => {
          const list = document.querySelector('.chat-messages');
          list?.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
        });
      }
    }
  }
  onEnter(event: Event): void {
    const key = event as KeyboardEvent;
    if (!key.shiftKey && !key.isComposing) {
      key.preventDefault();
      void this.send();
    }
  }
}

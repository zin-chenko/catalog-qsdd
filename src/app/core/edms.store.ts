import { computed, inject, Injectable, signal } from '@angular/core';
import { EdmsRepository } from './edms.repository';
import { Folder, Snapshot } from './models';
import { FOLDERS } from './mock-data';

@Injectable({ providedIn: 'root' })
export class EdmsStore {
  readonly api = inject(EdmsRepository);
  readonly state = signal<Snapshot | null>(null);
  readonly documents = computed(() => this.state()?.documents ?? []);
  readonly folders = computed(() => this.state()?.folders ?? FOLDERS);
  readonly folderTree = computed(() => {
    const rows: { folder: Folder; depth: number; path: string }[] = [];
    const visit = (parentId: string | undefined, depth: number, path: string) => {
      for (const folder of this.folders().filter((f) => f.parentId === parentId)) {
        const fullPath = path ? `${path} / ${folder.name}` : folder.name;
        rows.push({ folder, depth, path: fullPath });
        visit(folder.id, depth + 1, fullPath);
      }
    };
    visit(undefined, 0, '');
    return rows;
  });
  readonly workflowRoutes = computed(() => this.state()?.workflowRoutes ?? []);
  readonly tasks = computed(() => this.state()?.tasks ?? []);
  readonly user = computed(
    () =>
      this.state()?.user ?? {
        name: 'Смирнова Е.А.',
        initials: 'ЕС',
        role: 'reviewer' as const,
        substitute: '',
      },
  );
  readonly busy = signal(false);
  readonly toast = signal<{ text: string; error: boolean } | null>(null);
  private timer?: ReturnType<typeof setTimeout>;
  async load(): Promise<void> {
    try {
      this.state.set(await this.api.load());
    } catch (error) {
      this.notify(error instanceof Error ? error.message : 'Ошибка загрузки данных', true);
    }
  }
  async run<T>(operation: () => Promise<T>, success?: string): Promise<T | undefined> {
    if (this.busy()) return undefined;
    this.busy.set(true);
    try {
      const result = await operation();
      await this.load();
      if (success) this.notify(success);
      return result;
    } catch (error) {
      this.notify(
        error instanceof Error ? error.message : 'Не удалось выполнить действие. Повторите попытку.',
        true,
      );
      return undefined;
    } finally {
      this.busy.set(false);
    }
  }
  notify(text: string, error = false): void {
    clearTimeout(this.timer);
    this.toast.set({ text, error });
    this.timer = setTimeout(() => this.toast.set(null), error ? 10000 : 4500);
  }
}

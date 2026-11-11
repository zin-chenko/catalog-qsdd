import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { EdmsStore } from '../../core/edms.store';
import { DocumentFilesService } from '../../core/document-files.service';
import { PEOPLE } from '../../core/mock-data';
import { AssistantReference, DocumentTab, EdmsDocument, formatDate, today } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';
import { StatusComponent } from '../../shared/status.component';
import { DialogComponent } from '../../shared/dialog.component';
import { AssistantComponent } from '../assistant/assistant.component';
import { DocumentPreviewComponent } from './document-preview.component';

type Dialog = 'create' | 'edit' | 'delegate' | 'reject' | 'participant' | 'extra' | 'task' | 'compare' | null;
type SortKey = 'number' | 'date' | 'title' | 'author' | 'status' | 'deadline';
@Component({
  selector: 'app-documents',
  imports: [
    FormsModule,
    IconComponent,
    StatusComponent,
    DialogComponent,
    AssistantComponent,
    DocumentPreviewComponent,
  ],
  templateUrl: './documents.component.html',
})
export class DocumentsComponent {
  readonly store = inject(EdmsStore);
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  readonly files = inject(DocumentFilesService);
  readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly folder = computed(
    () =>
      this.store.folders().find((f) => f.id === this.params().get('folderId')) ??
      this.store.folders().find((f) => f.id === 'orders')!,
  );
  readonly folderPath = computed(
    () =>
      this.store.folderTree().find((row) => row.folder.id === this.folder().id)?.path ?? this.folder().name,
  );
  readonly tab = computed<DocumentTab>(() => {
    const tab = this.params().get('tab');
    return ['card', 'preview', 'route', 'versions'].includes(tab ?? '') ? (tab as DocumentTab) : 'list';
  });
  readonly selectedId = signal<string | null>('order-214');
  readonly doc = computed(() => {
    const id = this.params().get('documentId') ?? this.selectedId();
    return (
      this.store
        .documents()
        .find(
          (d) =>
            d.id === id &&
            (this.params().has('documentId') ||
              this.folder().id === 'center' ||
              d.folderId === this.folder().id),
        ) ?? null
    );
  });
  readonly sortKey = signal<SortKey>('date');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly filtered = computed(() => {
    const q = this.query();
    const search = (q.get('q') ?? '').toLocaleLowerCase('ru').trim();
    let documents = this.store
      .documents()
      .filter((d) => this.folder().id === 'center' || d.folderId === this.folder().id);
    documents = documents.filter(
      (d) =>
        (!search ||
          [d.number, d.title, d.author, d.department, ...d.tags, ...d.paragraphs]
            .join(' ')
            .toLocaleLowerCase('ru')
            .includes(search)) &&
        (!q.get('status') || d.status === q.get('status')) &&
        (!q.get('year') || d.date.startsWith(q.get('year')!)) &&
        (!q.get('author') || d.author === q.get('author')) &&
        (!q.get('type') || d.type === q.get('type')) &&
        (!q.get('department') || d.department.toLowerCase().includes(q.get('department')!.toLowerCase())) &&
        (!q.get('tag') || d.tags.some((t) => t.toLowerCase().includes(q.get('tag')!.toLowerCase()))) &&
        (!q.get('from') || d.date >= q.get('from')!) &&
        (!q.get('to') || d.date <= q.get('to')!),
    );
    const key = this.sortKey();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    return documents.sort(
      (a, b) => (a[key] ?? '').localeCompare(b[key] ?? '', 'ru', { numeric: true }) * direction,
    );
  });
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  readonly currentPage = computed(() => Math.min(this.page(), this.pages()));
  readonly visible = computed(() =>
    this.filtered().slice((this.currentPage() - 1) * this.pageSize(), this.currentPage() * this.pageSize()),
  );
  readonly first = computed(() =>
    this.filtered().length ? (this.currentPage() - 1) * this.pageSize() + 1 : 0,
  );
  readonly last = computed(() => Math.min(this.currentPage() * this.pageSize(), this.filtered().length));
  readonly hasFilters = computed(() => this.query().keys.length > 0);
  readonly context = computed(() => ({
    folderId: this.folder().id,
    documentId: this.tab() !== 'list' ? this.doc()?.id : undefined,
  }));
  readonly contextLabel = computed(() =>
    this.tab() !== 'list' && this.doc()
      ? `Приказ № ${this.doc()!.number}, версия ${this.doc()!.versions[0].number}`
      : `папка «${this.folder().name}», ${this.filtered().length} документов`,
  );
  readonly canDecide = computed(
    () =>
      this.doc()?.status === 'На согласовании' &&
      (this.doc()?.assignee === this.store.user().name || this.store.user().role === 'admin'),
  );
  readonly canEdit = computed(
    () =>
      !!this.doc() &&
      this.doc()!.status !== 'Зарегистрирован' &&
      (this.store.user().role === 'admin' || this.doc()!.author === this.store.user().name),
  );
  readonly canChangeRoute = computed(
    () =>
      this.doc()?.status === 'На согласовании' &&
      (this.store.user().role === 'admin' || this.doc()?.author === this.store.user().name),
  );
  readonly currentStage = computed(() => this.doc()?.route.find((s) => s.state === 'current'));
  readonly selectedVersions = signal<number[]>([3, 2]);
  readonly comparedVersions = computed(
    () =>
      this.doc()
        ?.versions.filter((v) => this.selectedVersions().includes(v.number))
        .sort((a, b) => a.number - b.number) ?? [],
  );
  readonly fileId = signal('main');
  readonly previewVersion = signal<number | null>(null);
  readonly highlightedParagraph = signal<number | null>(null);
  readonly dialog = signal<Dialog>(null);
  readonly assistantVisible = signal(window.matchMedia('(min-width: 1081px)').matches);
  readonly people = PEOPLE;
  readonly date = formatDate;
  readonly tabs: { id: DocumentTab; label: string }[] = [
    { id: 'list', label: 'Список документов' },
    { id: 'card', label: 'Карточка документа' },
    { id: 'preview', label: 'Предпросмотр' },
    { id: 'route', label: 'Маршрут' },
    { id: 'versions', label: 'Версии' },
  ];
  readonly columns: { key: SortKey; label: string }[] = [
    { key: 'number', label: 'Рег. №' },
    { key: 'date', label: 'Дата' },
    { key: 'title', label: 'Заголовок' },
    { key: 'author', label: 'Автор' },
    { key: 'status', label: 'Статус' },
    { key: 'deadline', label: 'Срок этапа' },
  ];
  comment = '';
  formTitle = '';
  formType = 'Приказ по основной деятельности';
  formText = '';
  formComment = '';
  formPerson = 'Иванов А.П.';
  formDeadline = '2026-11-25';
  readonly today = today();
  sort(key: SortKey): void {
    this.sortDirection.set(this.sortKey() === key && this.sortDirection() === 'asc' ? 'desc' : 'asc');
    this.sortKey.set(key);
    this.page.set(1);
  }
  navigate(tab: DocumentTab): void {
    if (tab !== 'list' && !this.doc()) return;
    void this.router.navigate(
      tab === 'list'
        ? ['/documents', this.folder().id]
        : ['/documents', this.folder().id, this.doc()!.id, tab],
      { queryParamsHandling: 'preserve' },
    );
  }
  open(doc: EdmsDocument, tab: DocumentTab = 'card'): void {
    this.selectedId.set(doc.id);
    this.fileId.set('main');
    this.previewVersion.set(null);
    this.highlightedParagraph.set(null);
    this.comment = '';
    this.selectedVersions.set(doc.versions.slice(0, 2).map((v) => v.number));
    void this.router.navigate(['/documents', doc.folderId, doc.id, tab]);
  }
  previewFile(id: string): void {
    this.fileId.set(id);
    this.previewVersion.set(null);
    this.navigate('preview');
  }
  openVersion(number: number): void {
    this.fileId.set('main');
    this.previewVersion.set(number);
    this.navigate('preview');
  }
  selectVersion(number: number): void {
    this.selectedVersions.update((selected) =>
      selected.includes(number)
        ? selected.filter((n) => n !== number)
        : selected.length < 2
          ? [...selected, number]
          : [selected[1], number],
    );
  }
  openReference(ref: AssistantReference): void {
    const doc = this.store.documents().find((d) => d.id === ref.documentId);
    if (!doc) return;
    this.open(doc, ref.paragraph ? 'preview' : 'card');
    this.highlightedParagraph.set(ref.paragraph ?? null);
    if (ref.paragraph)
      setTimeout(
        () =>
          document
            .getElementById(`paragraph-${ref.paragraph}`)
            ?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
        150,
      );
  }
  related(): EdmsDocument | undefined {
    return this.store.documents().find((d) => d.id === this.doc()?.relatedId);
  }
  isOverdue(doc: EdmsDocument): boolean {
    return (
      !!doc.deadline && doc.deadline < today() && ['На согласовании', 'На подписании'].includes(doc.status)
    );
  }
  showDialog(dialog: Dialog): void {
    this.formTitle =
      dialog === 'edit'
        ? (this.doc()?.title ?? '')
        : dialog === 'task'
          ? 'Ознакомить сотрудников с Положением о командировках'
          : '';
    this.formText = this.doc()?.paragraphs.join('\n\n') ?? '';
    this.formComment = '';
    this.formPerson = PEOPLE.find((p) => p !== this.doc()?.assignee) ?? PEOPLE[1];
    this.dialog.set(dialog);
  }
  async saveDialog(): Promise<void> {
    const dialog = this.dialog();
    const doc = this.doc();
    let result: unknown;
    if (dialog === 'create') {
      result = await this.store.run(
        () =>
          this.store.api.create({
            folderId: ['center', 'tasks'].includes(this.folder().id) ? 'orders' : this.folder().id,
            title: this.formTitle,
            type: this.formType,
            author: this.store.user().name,
            department: 'Департамент персонала',
          }),
        'Документ создан',
      );
      if (result) this.open(result as EdmsDocument);
    } else if (doc) {
      if (dialog === 'edit')
        result = await this.store.run(
          () =>
            this.store.api.save(
              doc,
              this.formTitle,
              this.formText
                .split(/\n+/)
                .map((p) => p.trim())
                .filter(Boolean),
              this.formComment,
            ),
          'Изменения сохранены. Создана новая версия',
        );
      if (dialog === 'delegate')
        result = await this.store.run(
          () => this.store.api.decide(doc.id, 'delegate', this.comment, this.formPerson),
          `Согласование делегировано: ${this.formPerson}`,
        );
      if (dialog === 'reject')
        result = await this.store.run(
          () => this.store.api.decide(doc.id, 'reject', this.comment),
          'Документ отклонён',
        );
      if (dialog === 'participant' || dialog === 'extra')
        result = await this.store.run(
          () => this.store.api.addParticipant(doc.id, this.formPerson, dialog === 'extra'),
          'Маршрут обновлён',
        );
      if (dialog === 'task')
        result = await this.store.run(
          () =>
            this.store.api.createTask({
              documentId: doc.id,
              title: this.formTitle.trim(),
              assignee: this.formPerson,
              deadline: this.formDeadline,
            }),
          'Поручение создано',
        );
    }
    if (result) this.dialog.set(null);
  }
  async approve(): Promise<void> {
    const doc = this.doc();
    if (doc) {
      await this.store.run(
        () => this.store.api.decide(doc.id, 'approve', this.comment),
        'Решение о согласовании сохранено',
      );
      this.comment = '';
    }
  }
  async submit(): Promise<void> {
    const doc = this.doc();
    if (doc)
      await this.store.run(
        () => this.store.api.decide(doc.id, 'submit', ''),
        'Документ отправлен на согласование',
      );
  }
  async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const doc = this.doc();
    if (!file || !doc) return;
    try {
      const data = await this.files.read(file);
      await this.store.run(() => this.store.api.addFile(doc.id, data), 'Файл добавлен');
    } catch (error) {
      this.store.notify(error instanceof Error ? error.message : 'Не удалось прочитать файл.', true);
    } finally {
      input.value = '';
    }
  }
  async download(fileId: string): Promise<void> {
    const doc = this.doc();
    const file = doc?.files.find((f) => f.id === fileId);
    if (doc && file) {
      try {
        await this.files.download(doc, file);
      } catch {
        this.store.notify('Не удалось подготовить файл.', true);
      }
    }
  }
}

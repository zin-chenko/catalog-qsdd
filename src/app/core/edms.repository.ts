import { Injectable } from '@angular/core';
import {
  AssistantContext,
  AssistantMessage,
  DocumentFile,
  EdmsDocument,
  Folder,
  NewDocument,
  Snapshot,
  Task,
  User,
  WorkflowRoute,
  WorkflowRouteInput,
  today,
} from './models';
import { createSeed, FOLDERS, makeDocument } from './mock-data';

/** Backend boundary. Replace the provider with an HTTP implementation when the API is ready. */
export abstract class EdmsRepository {
  abstract load(): Promise<Snapshot>;
  abstract saveWorkflowRoute(input: WorkflowRouteInput, id?: string): Promise<WorkflowRoute>;
  abstract duplicateWorkflowRoute(id: string): Promise<WorkflowRoute>;
  abstract createFolder(name: string, parentId?: string): Promise<Folder>;
  abstract create(input: NewDocument): Promise<EdmsDocument>;
  abstract save(
    document: EdmsDocument,
    title: string,
    paragraphs: string[],
    comment: string,
  ): Promise<EdmsDocument>;
  abstract decide(
    documentId: string,
    decision: 'approve' | 'reject' | 'delegate' | 'submit',
    comment: string,
    assignee?: string,
  ): Promise<EdmsDocument>;
  abstract addFile(documentId: string, file: DocumentFile): Promise<EdmsDocument>;
  abstract addParticipant(documentId: string, name: string, extraStep: boolean): Promise<EdmsDocument>;
  abstract createTask(task: Omit<Task, 'id' | 'done'>): Promise<Task>;
  abstract completeTask(id: string): Promise<void>;
  abstract updateUser(user: User): Promise<void>;
  abstract readNotifications(): Promise<void>;
  abstract ask(context: AssistantContext, question: string): Promise<AssistantMessage>;
}

const STORAGE_KEY = 'catalog-qsdd.demo.v1';
@Injectable()
export class MockEdmsRepository extends EdmsRepository {
  private state = this.restore();
  private restore(): Snapshot {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const state = JSON.parse(raw) as Snapshot;
        if (
          Array.isArray(state.documents) &&
          state.documents.length &&
          state.documents.every(
            (d) =>
              d.id &&
              Array.isArray(d.versions) &&
              Array.isArray(d.route) &&
              Array.isArray(d.files) &&
              Array.isArray(d.paragraphs),
          ) &&
          Array.isArray(state.tasks) &&
          Array.isArray(state.notifications) &&
          state.user?.name
        )
          return {
            ...state,
            folders: state.folders ?? structuredClone(FOLDERS),
            workflowRoutes: state.workflowRoutes ?? [],
          };
      }
    } catch {
      /* Invalid or unavailable browser storage: start a clean demo session. */
    }
    return createSeed();
  }
  private commit(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      throw new Error(
        'Не удалось сохранить изменения в браузере. Возможно, хранилище заполнено. Удалите лишние данные сайта или выберите файл меньшего размера.',
      );
    }
  }
  private transaction<T>(fn: () => T): T {
    const before = structuredClone(this.state);
    try {
      const result = fn();
      this.commit();
      return structuredClone(result);
    } catch (error) {
      this.state = before;
      throw error;
    }
  }
  private document(id: string): EdmsDocument {
    const doc = this.state.documents.find((d) => d.id === id);
    if (!doc) throw new Error('Документ не найден.');
    return doc;
  }
  private assertEditable(doc: EdmsDocument): void {
    if (doc.status === 'Зарегистрирован')
      throw new Error('Зарегистрированный документ закрыт для редактирования.');
    if (this.state.user.role !== 'admin' && doc.author !== this.state.user.name)
      throw new Error('Редактировать документ может автор или администратор.');
  }
  override async load(): Promise<Snapshot> {
    return structuredClone(this.state);
  }
  override async saveWorkflowRoute(input: WorkflowRouteInput, id?: string): Promise<WorkflowRoute> {
    return this.transaction(() => {
      const name = input.name.trim();
      if (!name || name.length > 100) throw new Error('Введите название маршрута до 100 символов.');
      if (
        this.state.workflowRoutes.some(
          (r) => r.id !== id && r.name.toLocaleLowerCase('ru') === name.toLocaleLowerCase('ru'),
        )
      )
        throw new Error('Маршрут с таким названием уже существует.');
      if (!input.steps.length) throw new Error('Добавьте хотя бы один шаг.');
      const existing = id ? this.state.workflowRoutes.find((r) => r.id === id) : undefined;
      if (id && !existing) throw new Error('Маршрут не найден.');
      const usedIds = new Set<string>();
      const steps = input.steps.map((step, index) => {
        if (
          !step.name.trim() ||
          step.name.trim().length > 100 ||
          !step.assignee.trim() ||
          step.assignee.trim().length > 100
        )
          throw new Error(`Шаг ${index + 1}: заполните название и исполнителя (до 100 символов).`);
        if (!['approval', 'signing'].includes(step.type))
          throw new Error(`Шаг ${index + 1}: выберите тип шага.`);
        const stepId =
          existing?.steps.some((s) => s.id === step.id) && !usedIds.has(step.id)
            ? step.id
            : crypto.randomUUID();
        usedIds.add(stepId);
        return { id: stepId, name: step.name.trim(), assignee: step.assignee.trim(), type: step.type };
      });
      const route: WorkflowRoute = { id: existing?.id ?? crypto.randomUUID(), name, steps };
      if (existing) this.state.workflowRoutes[this.state.workflowRoutes.indexOf(existing)] = route;
      else this.state.workflowRoutes.push(route);
      return route;
    });
  }
  override async duplicateWorkflowRoute(id: string): Promise<WorkflowRoute> {
    return this.transaction(() => {
      const original = this.state.workflowRoutes.find((r) => r.id === id);
      if (!original) throw new Error('Маршрут не найден.');
      let index = 1;
      let name: string;
      do {
        const suffix = index === 1 ? ' (копия)' : ` (копия ${index})`;
        name = original.name.slice(0, 100 - suffix.length) + suffix;
        index++;
      } while (
        this.state.workflowRoutes.some((r) => r.name.toLocaleLowerCase('ru') === name.toLocaleLowerCase('ru'))
      );
      const route: WorkflowRoute = {
        id: crypto.randomUUID(),
        name,
        steps: original.steps.map((s) => ({ ...s, id: crypto.randomUUID() })),
      };
      this.state.workflowRoutes.push(route);
      return route;
    });
  }
  override async createFolder(name: string, parentId?: string): Promise<Folder> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Введите название папки.');
    if (trimmed.length > 100) throw new Error('Название папки не должно превышать 100 символов.');
    return this.transaction(() => {
      if (
        parentId &&
        (!this.state.folders.some((f) => f.id === parentId) || ['center', 'tasks'].includes(parentId))
      )
        throw new Error('Выберите существующую папку для вложения.');
      if (
        this.state.folders.some(
          (f) =>
            f.parentId === parentId && f.name.toLocaleLowerCase('ru') === trimmed.toLocaleLowerCase('ru'),
        )
      )
        throw new Error('Папка с таким названием уже существует на этом уровне.');
      const folder: Folder = {
        id: crypto.randomUUID(),
        name: trimmed,
        icon: 'folder',
        ...(parentId ? { parentId } : {}),
      };
      this.state.folders.push(folder);
      return folder;
    });
  }
  override async create(input: NewDocument): Promise<EdmsDocument> {
    if (
      !this.state.folders.some((f) => f.id === input.folderId) ||
      ['center', 'tasks'].includes(input.folderId)
    )
      throw new Error('Папка для документа не найдена.');
    if (!input.title.trim()) throw new Error('Введите заголовок документа.');
    return this.transaction(() => {
      const doc = makeDocument({
        ...input,
        id: crypto.randomUUID(),
        title: input.title.trim(),
        number: 'проект',
        date: today(),
        status: 'Черновик',
        deadline: null,
        assignee: input.author,
        paragraphs: ['Текст нового документа. Откройте редактирование, чтобы добавить содержание.'],
      });
      this.state.documents.unshift(doc);
      return doc;
    });
  }
  override async save(
    document: EdmsDocument,
    title: string,
    paragraphs: string[],
    comment: string,
  ): Promise<EdmsDocument> {
    return this.transaction(() => {
      const doc = this.document(document.id);
      this.assertEditable(doc);
      if (!title.trim() || !paragraphs.length) throw new Error('Заполните заголовок и текст документа.');
      doc.title = title.trim();
      doc.paragraphs = paragraphs;
      doc.versions.unshift({
        number: doc.versions[0].number + 1,
        date: new Date().toISOString(),
        author: this.state.user.name,
        stage: doc.status,
        description: comment.trim() || 'Обновлены заголовок и содержание документа',
        title: doc.title,
        paragraphs: [...paragraphs],
      });
      return doc;
    });
  }
  override async decide(
    documentId: string,
    decision: 'approve' | 'reject' | 'delegate' | 'submit',
    comment: string,
    assignee?: string,
  ): Promise<EdmsDocument> {
    return this.transaction(() => {
      const doc = this.document(documentId);
      if (decision === 'submit') {
        if (
          doc.status !== 'Черновик' ||
          (doc.author !== this.state.user.name && this.state.user.role !== 'admin')
        )
          throw new Error('Отправка недоступна для текущего пользователя.');
        doc.status = 'На согласовании';
        doc.assignee = this.state.user.name;
        doc.deadline = today();
        doc.route = makeDocument().route;
        doc.route[0].participants[0].name = doc.author;
        return doc;
      }
      if (
        doc.status !== 'На согласовании' ||
        (doc.assignee !== this.state.user.name && this.state.user.role !== 'admin')
      )
        throw new Error('Решение недоступно для текущего пользователя или этапа.');
      if (decision === 'reject' && !comment.trim())
        throw new Error('Укажите причину отклонения в комментарии.');
      const step = doc.route.find((s) => s.state === 'current');
      if (decision === 'delegate') {
        if (!assignee || assignee === doc.assignee) throw new Error('Выберите другого сотрудника.');
        doc.assignee = assignee;
        if (step)
          step.participants = [
            { name: assignee, decision: 'Делегировано', date: new Date().toLocaleString('ru-RU'), comment },
          ];
      } else {
        if (!step) throw new Error('Нет активного этапа согласования.');
        const participant =
          step.participants.find((p) => p.name.startsWith(doc.assignee)) ??
          step.participants.find((p) => !p.decision.startsWith('Согласовано'));
        if (!participant) throw new Error('Все решения на текущем этапе уже приняты.');
        Object.assign(participant, {
          decision: decision === 'approve' ? 'Согласовано' : 'Отклонено',
          date: new Date().toLocaleString('ru-RU'),
          comment,
        });
        const pending = step.participants.find((p) => !p.decision.startsWith('Согласовано'));
        if (decision === 'reject') {
          step.state = 'done';
          doc.status = 'Отклонён';
          doc.deadline = null;
        } else if (pending) {
          doc.assignee = pending.name.replace(' (вы)', '');
        } else {
          step.state = 'done';
          const next = doc.route.find((s) => s.state === 'waiting');
          if (next) {
            next.state = 'current';
            doc.assignee = next.participants[0]?.name ?? '';
            doc.status = next.id === 'sign' ? 'На подписании' : 'На согласовании';
          }
        }
      }
      this.state.notifications.unshift({
        id: crypto.randomUUID(),
        documentId,
        title: decision === 'delegate' ? 'Согласование делегировано' : 'Статус документа изменён',
        detail: `№ ${doc.number} · ${doc.status}`,
        read: false,
      });
      return doc;
    });
  }
  override async addFile(documentId: string, file: DocumentFile): Promise<EdmsDocument> {
    return this.transaction(() => {
      const doc = this.document(documentId);
      this.assertEditable(doc);
      doc.files.push(file);
      doc.versions.unshift({
        ...structuredClone(doc.versions[0]),
        number: doc.versions[0].number + 1,
        date: new Date().toISOString(),
        author: this.state.user.name,
        description: `Добавлен файл ${file.name}`,
      });
      return doc;
    });
  }
  override async addParticipant(documentId: string, name: string, extraStep: boolean): Promise<EdmsDocument> {
    return this.transaction(() => {
      const doc = this.document(documentId);
      if (
        doc.status !== 'На согласовании' ||
        (this.state.user.role !== 'admin' && doc.author !== this.state.user.name)
      )
        throw new Error('Изменять маршрут может инициатор или администратор в активном процессе.');
      const index = doc.route.findIndex((s) => s.state === 'current');
      if (index < 0) throw new Error('Нет активного этапа.');
      if (!extraStep && doc.route[index].participants.some((p) => p.name.startsWith(name)))
        throw new Error('Этот сотрудник уже участвует в текущем этапе.');
      const participant = { name, decision: 'Ожидает решения' };
      if (extraStep)
        doc.route.splice(index + 1, 0, {
          id: crypto.randomUUID(),
          title: 'Дополнительное согласование',
          state: 'waiting',
          participants: [participant],
        });
      else {
        doc.route[index].parallel = true;
        doc.route[index].participants.push(participant);
      }
      return doc;
    });
  }
  override async createTask(input: Omit<Task, 'id' | 'done'>): Promise<Task> {
    if (!input.title.trim() || !input.assignee || !/^\d{4}-\d{2}-\d{2}$/.test(input.deadline))
      throw new Error('Заполните содержание, исполнителя и срок поручения.');
    return this.transaction(() => {
      this.document(input.documentId);
      const task = { ...input, id: crypto.randomUUID(), done: false };
      this.state.tasks.unshift(task);
      return task;
    });
  }
  override async completeTask(id: string): Promise<void> {
    this.transaction(() => {
      const task = this.state.tasks.find((t) => t.id === id);
      if (task) task.done = !task.done;
    });
  }
  override async updateUser(user: User): Promise<void> {
    this.transaction(() => {
      this.state.user = user;
    });
  }
  override async readNotifications(): Promise<void> {
    this.transaction(() => this.state.notifications.forEach((n) => (n.read = true)));
  }
  override async ask(context: AssistantContext, question: string): Promise<AssistantMessage> {
    const q = question.toLocaleLowerCase('ru');
    const message: AssistantMessage = { id: crypto.randomUUID(), role: 'assistant', text: '' };
    const doc = context.documentId ? this.document(context.documentId) : undefined;
    if (doc) {
      if (doc.id === 'order-214' && doc.versions[0].number === 3) {
        if (/срок|числ|когда|ознаком/.test(q)) {
          message.text =
            'До 25.11.2026 руководители подразделений должны ознакомить сотрудников с Положением под подпись в СЭД. Положение вступает в силу 01.12.2026.';
          message.references = [
            { label: 'п. 3', documentId: doc.id, paragraph: 3 },
            { label: 'п. 2', documentId: doc.id, paragraph: 2 },
          ];
          message.canCreateTask = true;
        } else if (/исполнител|кто|отвеча/.test(q)) {
          message.text =
            'Руководители подразделений отвечают за ознакомление сотрудников. Департамент персонала — за согласование командировок в СЭД. Контроль возложен на директора Департамента персонала.';
          message.references = [3, 4, 6].map((n) => ({ label: `п. ${n}`, documentId: doc.id, paragraph: n }));
        } else {
          message.text =
            'Приказ вводит новое Положение о командировках:\n• утверждает Положение и вводит его с 01.12.2026;\n• руководители знакомят сотрудников до 25.11.2026;\n• согласование командировок переводится в СЭД;\n• отменяется Приказ № 87-П от 14.03.2024.';
          message.references = [1, 3, 4, 5].map((n) => ({
            label: `п. ${n}`,
            documentId: doc.id,
            paragraph: n,
          }));
        }
      } else {
        message.text = `«${doc.title}»\n${doc.paragraphs.join('\n')}\nОтвет подготовлен по демонстрационным данным документа.`;
        message.references = [{ label: 'Открыть текст', documentId: doc.id, paragraph: 1 }];
      }
    } else {
      let docs = this.state.documents.filter(
        (d) => context.folderId === 'center' || d.folderId === context.folderId,
      );
      if (/командиров|смысл/.test(q))
        docs = this.state.documents.filter((d) => d.title.toLowerCase().includes('командиров'));
      else if (/просроч/.test(q))
        docs = docs.filter(
          (d) =>
            d.deadline && d.deadline < today() && ['На согласовании', 'На подписании'].includes(d.status),
        );
      else if (/решени|согласова/.test(q))
        docs = docs.filter((d) => d.status === 'На согласовании' && d.assignee === this.state.user.name);
      else {
        const words = q.split(/\s+/).filter((w) => w.length > 3);
        docs = docs.filter((d) => words.some((w) => (d.title + ' ' + d.number).toLowerCase().includes(w)));
      }
      message.text = docs.length
        ? `Найдено документов: ${docs.length}.\n` +
          docs
            .slice(0, 5)
            .map(
              (d) =>
                `• № ${d.number} — ${d.title}${d.deadline ? ', срок ' + d.deadline.split('-').reverse().join('.') : ''}`,
            )
            .join('\n')
        : 'В текущей папке подходящих документов нет. Попробуйте указать номер или ключевое слово из заголовка.';
      message.references = docs.slice(0, 5).map((d) => ({ label: `№ ${d.number}`, documentId: d.id }));
    }
    return message;
  }
}

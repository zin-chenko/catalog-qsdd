import '@angular/compiler';
import { expect, test } from '@playwright/test';
import { MockEdmsRepository } from '../src/app/core/edms.repository';
import { WorkflowRouteInput, WorkflowStepType } from '../src/app/core/models';

const storageKey = 'catalog-qsdd.demo.v1';
let data: Map<string, string>;
let failWrites = false;
const input = (): WorkflowRouteInput => ({
  name: '  Согласование договора  ',
  steps: [
    { id: 'temporary-1', name: '  Проверка юристом  ', assignee: '  Петрова О.В.  ', type: 'approval' },
    { id: 'temporary-2', name: 'Подпись директора', assignee: 'Иванов А.П.', type: 'signing' },
  ],
});
test.beforeEach(() => {
  data = new Map();
  failWrites = false;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (failWrites) throw new Error('quota');
        data.set(key, value);
      },
    },
  });
});

test('create and edit ordered typed steps, then restore the route', async () => {
  const repo = new MockEdmsRepository();
  const route = await repo.saveWorkflowRoute(input());
  expect(route.name).toBe('Согласование договора');
  expect(route.steps.map((s) => [s.name, s.assignee, s.type])).toEqual([
    ['Проверка юристом', 'Петрова О.В.', 'approval'],
    ['Подпись директора', 'Иванов А.П.', 'signing'],
  ]);
  const saved = await repo.saveWorkflowRoute(
    { name: 'Новый порядок', steps: [...route.steps].reverse() },
    route.id,
  );
  expect(saved.id).toBe(route.id);
  expect(saved.steps.map((s) => s.id)).toEqual(route.steps.map((s) => s.id).reverse());
  const restored = await new MockEdmsRepository().load();
  expect(restored.workflowRoutes).toEqual([saved]);
  saved.steps[0].name = 'Внешнее изменение';
  expect((await repo.load()).workflowRoutes[0].steps[0].name).toBe('Подпись директора');
});

test('duplicating twice creates independent routes and unique step IDs and names', async () => {
  const repo = new MockEdmsRepository();
  const original = await repo.saveWorkflowRoute(input());
  const copy = await repo.duplicateWorkflowRoute(original.id);
  const second = await repo.duplicateWorkflowRoute(original.id);
  expect(copy.name).toBe('Согласование договора (копия)');
  expect(second.name).toBe('Согласование договора (копия 2)');
  expect(new Set([original.id, copy.id, second.id]).size).toBe(3);
  expect(new Set([...original.steps, ...copy.steps, ...second.steps].map((s) => s.id)).size).toBe(6);
  copy.steps[0].name = 'Другой шаг';
  await repo.saveWorkflowRoute(copy, copy.id);
  const state = await new MockEdmsRepository().load();
  expect(state.workflowRoutes.find((r) => r.id === original.id)).toEqual(original);
  expect(state.workflowRoutes.find((r) => r.id === copy.id)?.steps[0].name).toBe('Другой шаг');
});

test('old data migrates without resetting documents, folders or tasks', async () => {
  const repo = new MockEdmsRepository();
  await repo.createFolder('Существующая папка');
  const { workflowRoutes, ...legacy } = await repo.load();
  data.set(storageKey, JSON.stringify(legacy));
  const restored = new MockEdmsRepository();
  expect(await restored.load()).toEqual({ ...legacy, workflowRoutes: [] });
  await restored.saveWorkflowRoute(input());
  const next = await new MockEdmsRepository().load();
  expect(next.documents).toEqual(legacy.documents);
  expect(next.folders).toEqual(legacy.folders);
  expect(next.tasks).toEqual(legacy.tasks);
});

test('invalid routes and missing edit targets do not change saved state', async () => {
  const repo = new MockEdmsRepository();
  const original = await repo.saveWorkflowRoute(input());
  const before = await repo.load();
  await expect(repo.saveWorkflowRoute({ ...input(), name: ' ' })).rejects.toThrow('название');
  await expect(repo.saveWorkflowRoute({ ...input(), name: 'x'.repeat(101) })).rejects.toThrow('100');
  await expect(repo.saveWorkflowRoute({ ...input(), name: 'Пустой маршрут', steps: [] })).rejects.toThrow(
    'хотя бы один',
  );
  await expect(repo.saveWorkflowRoute({ ...input(), name: 'согласование договора' })).rejects.toThrow(
    'уже существует',
  );
  await expect(
    repo.saveWorkflowRoute({ name: 'Нет шага', steps: [{ ...original.steps[0], name: ' ' }] }),
  ).rejects.toThrow('Шаг 1');
  await expect(
    repo.saveWorkflowRoute({ name: 'Нет исполнителя', steps: [{ ...original.steps[0], assignee: ' ' }] }),
  ).rejects.toThrow('Шаг 1');
  await expect(
    repo.saveWorkflowRoute({
      name: 'Нет типа',
      steps: [{ ...original.steps[0], type: 'other' as WorkflowStepType }],
    }),
  ).rejects.toThrow('тип шага');
  await expect(repo.saveWorkflowRoute({ ...input(), name: 'Другое имя' }, 'missing')).rejects.toThrow(
    'не найден',
  );
  await expect(repo.duplicateWorkflowRoute('missing')).rejects.toThrow('не найден');
  expect(await repo.load()).toEqual(before);
});

test('storage failure rolls back both edits and copies', async () => {
  const repo = new MockEdmsRepository();
  const original = await repo.saveWorkflowRoute(input());
  const before = await repo.load();
  failWrites = true;
  await expect(repo.saveWorkflowRoute({ ...original, name: 'Не сохранится' }, original.id)).rejects.toThrow(
    'Не удалось сохранить',
  );
  await expect(repo.duplicateWorkflowRoute(original.id)).rejects.toThrow('Не удалось сохранить');
  expect(await repo.load()).toEqual(before);
});

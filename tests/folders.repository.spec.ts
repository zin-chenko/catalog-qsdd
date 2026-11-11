import '@angular/compiler';
import { expect, test } from '@playwright/test';
import { MockEdmsRepository } from '../src/app/core/edms.repository';

const key = 'catalog-qsdd.demo.v1';
let data: Map<string, string>;
let failWrites = false;
test.beforeEach(() => {
  data = new Map();
  failWrites = false;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (name: string) => data.get(name) ?? null,
      setItem: (name: string, value: string) => {
        if (failWrites) throw new Error('quota');
        data.set(name, value);
      },
    },
  });
});

test('nested folders and their documents survive a reload', async () => {
  const repo = new MockEdmsRepository();
  const root = await repo.createFolder('  Проекты 2027  ');
  const child = await repo.createFolder('Договоры', root.id);
  const nested = await repo.createFolder('Январь', child.id);
  const doc = await repo.create({
    folderId: nested.id,
    title: 'Договор',
    type: 'Договор',
    author: 'Смирнова Е.А.',
    department: 'HR',
  });
  const restored = await new MockEdmsRepository().load();
  expect(restored.folders.find((f) => f.id === root.id)?.name).toBe('Проекты 2027');
  expect(restored.folders.find((f) => f.id === child.id)?.parentId).toBe(root.id);
  expect(restored.folders.find((f) => f.id === nested.id)?.parentId).toBe(child.id);
  expect(restored.documents.find((d) => d.id === doc.id)?.folderId).toBe(nested.id);
});

test('legacy browser data gains folders without losing edits or documents', async () => {
  const repo = new MockEdmsRepository();
  const state = await repo.load();
  state.documents[0].title = 'Сохранённое изменение';
  const { folders, ...legacy } = state;
  data.set(key, JSON.stringify(legacy));
  const restored = new MockEdmsRepository();
  const next = await restored.load();
  expect(next.documents).toEqual(legacy.documents);
  expect(next.tasks).toEqual(legacy.tasks);
  expect(next.folders.find((f) => f.id === 'orders')?.parentId).toBe('organizational');
  await restored.createFolder('Новая папка');
  expect((await new MockEdmsRepository().load()).documents).toEqual(legacy.documents);
});

test('names and parents are validated, duplicate names are scoped to siblings', async () => {
  const repo = new MockEdmsRepository();
  const a = await repo.createFolder('Проекты');
  const b = await repo.createFolder('Архив проектов');
  await repo.createFolder('Договоры', a.id);
  await expect(repo.createFolder(' договоры ', a.id)).rejects.toThrow('уже существует');
  await expect(repo.createFolder('Договоры', b.id)).resolves.toBeTruthy();
  await expect(repo.createFolder('   ')).rejects.toThrow('название');
  await expect(repo.createFolder('x'.repeat(101))).rejects.toThrow('100');
  for (const parent of ['missing', 'center', 'tasks']) {
    await expect(repo.createFolder('Папка', parent)).rejects.toThrow('для вложения');
  }
  await expect(
    repo.create({ folderId: 'missing', title: 'Документ', type: 'Приказ', author: 'A', department: 'B' }),
  ).rejects.toThrow('не найдена');
});

test('failed persistence rolls back folder creation', async () => {
  const repo = new MockEdmsRepository();
  const before = await repo.load();
  failWrites = true;
  await expect(repo.createFolder('Не сохранится')).rejects.toThrow('Не удалось сохранить');
  expect(await repo.load()).toEqual(before);
});

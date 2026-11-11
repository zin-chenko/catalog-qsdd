import { expect, test } from '@playwright/test';
import { documentApprovals } from '../src/app/core/document-approvals';
import { makeDocument } from '../src/app/core/mock-data';
import { DocumentApproval } from '../src/app/core/models';

const approval = (id: string, routeId: string, startedAt: string): DocumentApproval => ({
  id,
  routeId,
  routeName: 'Согласование договора',
  version: 1,
  status: 'Согласовано',
  initiator: 'Иванов А.П.',
  startedAt,
  steps: [],
});

test('one document can have repeat approvals on the same route and other routes', () => {
  const history = [
    approval('one', 'legal', '2026-10-01'),
    approval('two', 'legal', '2026-10-05'),
    approval('three', 'signing', '2026-10-03'),
  ];
  const doc = makeDocument({ approvals: history });
  const before = structuredClone(doc);
  expect(documentApprovals(doc).map((a) => a.id)).toEqual(['two', 'three', 'one']);
  expect(doc).toEqual(before);
  expect(doc.approvals?.map((a) => a.id)).toEqual(['one', 'two', 'three']);
});

test('legacy demo becomes one view record without persisting or changing its state', () => {
  const doc = makeDocument();
  const before = structuredClone(doc);
  const records = documentApprovals(doc);
  expect(records).toHaveLength(1);
  expect(records[0].steps).toEqual(doc.route);
  expect(records[0].status).toBe('На согласовании');
  expect(doc).toEqual(before);
  expect(doc.approvals).toBeUndefined();
});

test('empty collections override legacy state and draft documents have no legacy approvals', () => {
  expect(documentApprovals(makeDocument({ approvals: [] }))).toEqual([]);
  expect(documentApprovals(makeDocument({ status: 'Черновик' }))).toEqual([]);
  expect(documentApprovals(makeDocument({ status: 'Зарегистрирован' }))[0].status).toBe('Согласовано');
  expect(documentApprovals(makeDocument({ status: 'Отклонён' }))[0].status).toBe('Отклонено');
});

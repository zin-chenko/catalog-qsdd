import { DocumentApproval, EdmsDocument } from './models';

/** Read adapter for older demo data. An explicit BPM collection, including [], takes priority. */
export function documentApprovals(document: EdmsDocument): DocumentApproval[] {
  if (document.approvals !== undefined)
    return [...document.approvals].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (document.status === 'Черновик' || !document.route.length) return [];
  return [
    {
      id: `legacy-${document.id}`,
      routeName: document.type.startsWith('Приказ') ? 'ОРД — приказ' : 'Общее согласование документа',
      version: document.versions[0]?.number ?? 1,
      status:
        document.status === 'Зарегистрирован'
          ? 'Согласовано'
          : document.status === 'Отклонён'
            ? 'Отклонено'
            : document.status,
      initiator: document.author,
      startedAt: document.date,
      steps: document.route,
    },
  ];
}

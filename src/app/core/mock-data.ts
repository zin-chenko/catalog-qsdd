import { EdmsDocument, Folder, Snapshot, DocumentStatus, RouteStep } from './models';

export const FOLDERS: Folder[] = [
  { id: 'center', name: 'Центр документов', icon: 'folder' },
  { id: 'incoming', name: 'Входящая корреспонденция', icon: 'folder' },
  { id: 'outgoing', name: 'Исходящая корреспонденция', icon: 'folder' },
  { id: 'organizational', name: 'Организационно-распорядительные', icon: 'folder' },
  { id: 'orders', name: 'Приказы', icon: 'folder', parentId: 'organizational' },
  { id: 'directives', name: 'Распоряжения', icon: 'folder', parentId: 'organizational' },
  { id: 'memos', name: 'Служебные записки', icon: 'folder', parentId: 'organizational' },
  { id: 'regulations', name: 'Внутренние нормативные', icon: 'folder' },
  { id: 'tasks', name: 'Контроль поручений', icon: 'check-square' },
  { id: 'minutes', name: 'Протоколы заседаний', icon: 'folder' },
  { id: 'archive', name: 'Архив', icon: 'archive' },
];
export const PEOPLE = [
  'Смирнова Е.А.',
  'Иванов А.П.',
  'Орлова Н.В.',
  'Петрова О.В.',
  'Ким Д.С.',
  'Белов С.И.',
  'Козлова М.Р.',
];
export const ORDER_PARAGRAPHS = [
  'Утвердить Положение о служебных командировках работников Банка (Приложение 1).',
  'Ввести Положение в действие с 01.12.2026.',
  'Руководителям структурных подразделений ознакомить работников с Положением под подпись в СЭД в срок до 25.11.2026.',
  'Департаменту персонала обеспечить согласование командировок через модуль СЭД начиная с 01.12.2026.',
  'Признать утратившим силу Приказ № 87-П от 14.03.2024.',
  'Контроль за исполнением приказа возложить на директора Департамента персонала.',
];
function route(status: DocumentStatus, author: string): RouteStep[] {
  if (status === 'Черновик')
    return [
      {
        id: 'start',
        title: 'Инициатор',
        state: 'current',
        participants: [{ name: author, decision: 'Подготовка документа' }],
      },
    ];
  return [
    {
      id: 'start',
      title: 'Инициатор',
      state: 'done',
      participants: [
        {
          name: author + ' · Департамент персонала',
          decision: 'Отправлено на согласование',
          date: '28.10.2026 10:14',
        },
      ],
    },
    {
      id: 'legal',
      title: 'Юридический департамент',
      state: 'done',
      parallel: true,
      participants: [
        { name: 'Петрова О.В.', decision: 'Согласовано', date: '29.10.2026 16:02', comment: 'Без замечаний' },
        {
          name: 'Ким Д.С.',
          decision: 'Согласовано с замечаниями',
          date: '30.10.2026 11:20',
          comment: 'В п. 5 указать реквизиты отменяемого приказа → учтено в версии 3',
        },
      ],
    },
    {
      id: 'hr',
      title: 'HR-департамент',
      state: status === 'На согласовании' ? 'current' : 'done',
      participants: [
        {
          name: 'Смирнова Е.А. (вы)',
          decision:
            status === 'Отклонён'
              ? 'Отклонено'
              : status === 'На согласовании'
                ? 'На согласовании'
                : 'Согласовано',
          date: '30.10.2026 11:25',
        },
      ],
    },
    {
      id: 'sign',
      title: 'Подписание УКЭП',
      state: status === 'На подписании' ? 'current' : status === 'Зарегистрирован' ? 'done' : 'waiting',
      participants: [
        { name: 'Председатель Правления', decision: status === 'Зарегистрирован' ? 'Подписано' : 'Ожидает' },
      ],
    },
    {
      id: 'register',
      title: 'Регистрация',
      state: status === 'Зарегистрирован' ? 'done' : 'waiting',
      participants: [
        {
          name: 'Канцелярия',
          decision:
            status === 'Зарегистрирован' ? 'Зарегистрировано' : 'Ожидает · затем рассылка на ознакомление',
        },
      ],
    },
  ];
}
export function makeDocument(overrides: Partial<EdmsDocument> = {}): EdmsDocument {
  const doc: EdmsDocument = {
    id: 'order-214',
    folderId: 'orders',
    number: '214-П',
    date: '2026-10-28',
    title: 'Об утверждении Положения о служебных командировках',
    author: 'Иванов А.П.',
    department: 'Департамент персонала',
    status: 'На согласовании',
    deadline: '2026-11-07',
    type: 'Приказ по основной деятельности',
    signer: 'Председатель Правления',
    legalEntity: 'Банк, головной офис',
    access: 'Общий',
    caseNumber: '01-05 Приказы по основной деятельности',
    retention: 'Постоянно',
    controller: 'Директор Департамента персонала',
    tags: ['ОРД', 'персонал'],
    files: [],
    versions: [],
    route: [],
    assignee: 'Смирнова Е.А.',
    paragraphs: [...ORDER_PARAGRAPHS],
    ...overrides,
  };
  doc.files = overrides.files ?? [
    { id: 'main', name: `Приказ_${doc.number}.docx`, kind: 'DOCX', size: '48 КБ', main: true },
  ];
  doc.versions = overrides.versions ?? [
    {
      number: 1,
      date: doc.date + 'T10:10:00',
      author: doc.author,
      stage: 'Черновик',
      description: 'Первоначальная редакция',
      title: doc.title,
      paragraphs: [...doc.paragraphs],
    },
  ];
  doc.route = overrides.route ?? route(doc.status, doc.author);
  return doc;
}
export function createSeed(): Snapshot {
  const primary = makeDocument({ relatedId: 'order-87' });
  primary.files.push(
    {
      id: 'attachment',
      name: 'Приложение_1_Положение.docx',
      kind: 'DOCX',
      size: '212 КБ',
      text: 'ПОЛОЖЕНИЕ О СЛУЖЕБНЫХ КОМАНДИРОВКАХ\n1. Общие положения\nСлужебная командировка — поездка работника по распоряжению работодателя на определённый срок для выполнения служебного поручения.\n2. Порядок согласования\nРаботник направляет заявку через СЭД. Руководитель подразделения согласовывает цель, сроки и бюджет поездки.\n3. Возмещение расходов\nБанк возмещает документально подтверждённые расходы на проезд и проживание.\n4. Отчётность\nАвансовый отчёт представляется в течение трёх рабочих дней после возвращения.',
    },
    { id: 'approval', name: 'Лист_согласования.pdf', kind: 'PDF', size: '36 КБ', automatic: true },
  );
  const v1 = [...ORDER_PARAGRAPHS];
  v1[2] = v1[2].replace('25.11.2026', '20.11.2026');
  v1[4] = 'Признать утратившим силу ранее действующее Положение о командировках.';
  const v2 = [...ORDER_PARAGRAPHS];
  v2[4] = v1[4];
  primary.versions = [
    {
      number: 3,
      date: '2026-10-30T15:42:00',
      author: 'Иванов А.П.',
      stage: 'Юр. департамент',
      description: 'П. 5: указаны реквизиты отменяемого приказа № 87-П',
      title: primary.title,
      paragraphs: [...ORDER_PARAGRAPHS],
    },
    {
      number: 2,
      date: '2026-10-29T12:05:00',
      author: 'Петрова О.В.',
      stage: 'Юр. департамент',
      description: 'П. 3: срок ознакомления перенесён на 25.11.2026',
      title: primary.title,
      paragraphs: v2,
    },
    {
      number: 1,
      date: '2026-10-28T10:10:00',
      author: 'Иванов А.П.',
      stage: 'Черновик',
      description: 'Первоначальная редакция',
      title: primary.title,
      paragraphs: v1,
    },
  ];
  const rows: [string, string, string, string, DocumentStatus, string | null][] = [
    [
      '213-П',
      '2026-10-27',
      'О внесении изменений в штатное расписание',
      'Орлова Н.В.',
      'Зарегистрирован',
      null,
    ],
    [
      '211-П',
      '2026-10-24',
      'О проведении годовой инвентаризации',
      'Белов С.И.',
      'На согласовании',
      '2026-11-12',
    ],
    [
      '210-П',
      '2026-10-22',
      'Об изменении режима работы дополнительных офисов',
      'Козлова М.Р.',
      'На подписании',
      '2026-11-05',
    ],
    [
      '209-П',
      '2026-10-20',
      'Об утверждении Регламента работы с обращениями клиентов',
      'Иванов А.П.',
      'Зарегистрирован',
      null,
    ],
    ['208-П', '2026-10-17', 'О составе Кредитного комитета', 'Орлова Н.В.', 'Отклонён', null],
    [
      'проект',
      '2026-10-16',
      'О назначении ответственных за архивное хранение',
      'Смирнова Е.А.',
      'Черновик',
      null,
    ],
  ];
  const documents = [
    primary,
    ...rows.map(([number, date, title, author, status, deadline], i) =>
      makeDocument({
        id: 'order-' + (i + 1),
        number,
        date,
        title,
        author,
        status,
        deadline,
        paragraphs: [
          `Утвердить решение: ${title.toLowerCase()}.`,
          'Руководителям подразделений организовать исполнение настоящего приказа.',
          'Контроль исполнения возложить на руководителя ответственного подразделения.',
        ],
      }),
    ),
  ];
  const subjects = [
    'О повышении квалификации сотрудников',
    'Об организации внутреннего контроля',
    'Об утверждении графика отпусков',
    'О проведении плановой проверки',
    'Об актуализации внутренних регламентов',
    'О назначении ответственных лиц',
  ];
  for (let i = 0; i < 121; i++)
    documents.push(
      makeDocument({
        id: `order-extra-${i}`,
        number: `${207 - i}-П`,
        date: new Date(Date.UTC(2026, 9, 15 - i)).toISOString().slice(0, 10),
        title:
          subjects[i % subjects.length] +
          ` · ${['головной офис', 'региональная сеть', 'операционный блок'][i % 3]}`,
        author: PEOPLE[(i + 1) % PEOPLE.length],
        status: 'Зарегистрирован',
        deadline: null,
        paragraphs: [
          'Утвердить мероприятия согласно приложению к настоящему приказу.',
          'Ответственным лицам обеспечить выполнение мероприятий в установленный срок.',
        ],
      }),
    );
  documents.push(
    makeDocument({
      id: 'order-87',
      folderId: 'archive',
      number: '87-П',
      date: '2024-03-14',
      title: 'Об утверждении Положения о служебных командировках (редакция 2024)',
      status: 'Зарегистрирован',
      deadline: null,
      paragraphs: [
        'Утвердить Положение о служебных командировках работников Банка.',
        'Ввести Положение в действие с 01.04.2024.',
      ],
    }),
  );
  for (const [folderId, count, label] of [
    ['incoming', 34, 'Входящее письмо'],
    ['outgoing', 8, 'Исходящее письмо'],
    ['directives', 46, 'Распоряжение'],
    ['memos', 311, 'Служебная записка'],
    ['regulations', 6, 'Внутренний регламент'],
    ['minutes', 4, 'Протокол заседания'],
  ] as const) {
    for (let i = 0; i < count; i++)
      documents.push(
        makeDocument({
          id: `${folderId}-${i}`,
          folderId,
          number: `${101 + i}`,
          date: `2026-10-${String(28 - (i % 25)).padStart(2, '0')}`,
          title: `${label}: ${subjects[i % subjects.length].toLowerCase()}`,
          type: label,
          status: i % 3 === 0 ? 'На согласовании' : 'Зарегистрирован',
          deadline: i % 3 === 0 ? '2026-11-12' : null,
          paragraphs: [
            'Просим ознакомиться с документом и направить решение ответственному сотруднику.',
            'Ответственный: Департамент персонала.',
          ],
        }),
      );
  }
  return {
    folders: structuredClone(FOLDERS),
    documents,
    user: { name: 'Смирнова Е.А.', initials: 'ЕС', role: 'reviewer', substitute: '' },
    tasks: Array.from({ length: 5 }, (_, i) => ({
      id: `task-${i}`,
      documentId: primary.id,
      title: [
        'Ознакомить сотрудников с Положением о командировках',
        'Подготовить перечень ответственных',
        'Обновить регламент согласования',
        'Проверить комплектность документов',
        'Подготовить отчёт об исполнении',
      ][i],
      assignee: PEOPLE[i],
      deadline: i === 3 ? '2026-11-05' : '2026-11-25',
      done: false,
    })),
    notifications: [
      {
        id: 'n1',
        documentId: primary.id,
        title: 'Истёк срок согласования',
        detail: 'Приказ № 214-П · срок 07.11.2026',
        read: false,
      },
      {
        id: 'n2',
        documentId: 'order-2',
        title: 'Документ ожидает решения',
        detail: 'Годовая инвентаризация · срок 12.11.2026',
        read: false,
      },
      {
        id: 'n3',
        documentId: primary.id,
        title: 'Доступна новая версия',
        detail: 'Иванов А.П. добавил версию 3 приказа № 214-П',
        read: false,
      },
    ],
  };
}

# Подключение backend Q.EDMS

Ниже предложен контракт для последующей реализации. В текущем приложении HTTP-вызовов нет: `MockEdmsRepository` возвращает и изменяет локальные данные. Имена URL и DTO следует согласовать при проектировании сервера.

## Точки интеграции

| Область                           | Предлагаемый запрос                                               | Текущая реализация                                     |
| --------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| Пользователь, права, замещение    | `GET /api/me`, `PATCH /api/me/preferences`                        | `load`, `updateUser`                                   |
| Каталог и видимость папок         | `GET /api/folders`                                                | `FOLDERS` в `mock-data.ts`                             |
| Справочник сотрудников            | `GET /api/dictionaries/employees?q=...`                           | `PEOPLE` в `mock-data.ts`                              |
| Виды документов и схема атрибутов | `GET /api/document-types`                                         | `type` и поля `EdmsDocument`                           |
| Список и поиск                    | `GET /api/documents`                                              | `load`, фильтрация в `DocumentsComponent`              |
| Карточка                          | `GET /api/documents/{id}`                                         | `load` → `Snapshot.documents`                          |
| Создание                          | `POST /api/documents`                                             | `create(NewDocument)`                                  |
| Сохранение и новая версия         | `PATCH /api/documents/{id}`                                       | `save(document, title, paragraphs, comment)`           |
| Файлы документа                   | `GET /api/documents/{id}/files`                                   | `EdmsDocument.files`                                   |
| Загрузка файла                    | `POST /api/documents/{id}/files` (`multipart/form-data`)          | `DocumentFilesService.read`, `addFile`                 |
| Скачивание                        | `GET /api/documents/{id}/files/{fileId}/content?version=3`        | `DocumentFilesService.download`                        |
| Предпросмотр                      | `GET /api/documents/{id}/files/{fileId}/preview?version=3`        | `DocumentPreviewComponent`                             |
| Лист согласования                 | `GET /api/documents/{id}/approval-sheet`                          | `public/mock/approval-sheet.pdf`                       |
| Маршрут                           | `GET /api/documents/{id}/workflow`                                | `EdmsDocument.route`                                   |
| Запуск согласования               | `POST /api/documents/{id}/workflow/submit`                        | `decide(id, 'submit', ...)`                            |
| Решение                           | `POST /api/documents/{id}/workflow/decisions`                     | `decide(id, 'approve' \| 'reject' \| 'delegate', ...)` |
| Участник этапа                    | `POST /api/documents/{id}/workflow/participants`                  | `addParticipant(id, name, false)`                      |
| Дополнительный этап               | `POST /api/documents/{id}/workflow/steps`                         | `addParticipant(id, name, true)`                       |
| Список версий                     | `GET /api/documents/{id}/versions`                                | `EdmsDocument.versions`                                |
| Редакция                          | `GET /api/documents/{id}/versions/{number}`                       | `DocumentVersion`                                      |
| Сравнение                         | `GET /api/documents/{id}/versions/compare?from=2&to=3`            | сравнение абзацев в интерфейсе                         |
| Поручения                         | `GET /api/tasks`, `POST /api/tasks`                               | `load`, `createTask`                                   |
| Статус поручения                  | `PATCH /api/tasks/{id}`                                           | `completeTask`                                         |
| Уведомления                       | `GET /api/notifications`, `POST /api/notifications/read`          | `load`, `readNotifications`                            |
| Ответ помощника                   | `POST /api/assistant/messages`                                    | `ask(context, question)`                               |
| Отчёты                            | `GET /api/reports/documents`, `GET /api/reports/documents/export` | `ReportsComponent` вычисляет данные и CSV              |

## Список документов

Параметры: `folderId`, `q`, `scope=folder|all`, `status`, `type`, `authorId`, `departmentId`, `tag`, `dateFrom`, `dateTo`, `year`, `sortBy`, `sortDirection`, `page`, `pageSize`.

Предлагаемый ответ:

```json
{
  "items": [],
  "total": 128,
  "page": 1,
  "pageSize": 20
}
```

Сейчас фильтрация, поиск текста, сортировка, счётчики и пагинация выполняются в браузере. При переходе на серверный список перенести эти операции в repository и передавать в него текущие параметры из URL. Не загружать всю базу через нынешний `Snapshot`: это удобный контракт локальной демонстрации. В HTTP-реализации store следует разделить на текущую страницу списка, открытую карточку и небольшие справочники.

## Документ и версии

Типы клиентской модели находятся в `src/app/core/models.ts`. Серверные идентификаторы сотрудников, видов, статусов, юридических лиц и дел нужно передавать отдельно от отображаемых названий. Даты документов — `YYYY-MM-DD`; даты событий — ISO 8601 с часовым поясом.

При сохранении передавать номер ожидаемой версии (`expectedVersion` либо `If-Match`) и комментарий к изменениям. Сервер атомарно создаёт следующую версию, сохраняет бинарные файлы и аудит. Конфликт редактирования возвращает `409`/`412`; клиент предлагает перечитать документ. Зарегистрированная версия неизменяема.

Загрузка файлов в production использует `FormData`, а не `dataUrl`. Превью возвращает PDF/изображение и карту пунктов к страницам, позволяющую выполнить переход из ответа ассистента. Скачивание должно задавать правильные MIME и `Content-Disposition`. Не возвращать произвольные URL без проверки источника.

## Решение по маршруту

```json
{
  "decision": "approve",
  "stepId": "hr",
  "comment": "Без замечаний",
  "delegateTo": null,
  "expectedVersion": 3
}
```

Сервер определяет доступные действия по роли, текущему этапу и назначению. Рекомендуется возвращать `allowedActions` вместе с карточкой вместо самостоятельного вывода всех прав из статуса на клиенте. Переход происходит после решений всех участников параллельного этапа. Дополнительные этапы выполняются в заданном порядке. Подписание УКЭП и регистрация — самостоятельные серверные операции; в демо показаны их ожидающие состояния.

## AI-ассистент

```json
{
  "conversationId": "optional-id",
  "context": { "folderId": "orders", "documentId": "order-214", "version": 3 },
  "question": "До какого числа ознакомить сотрудников?"
}
```

Предлагаемый ответ: текст и массив ссылок `{ documentId, version, fileId, paragraph, page, label }`. Текущая модель использует `documentId` и `paragraph`. Ссылки отображаются отдельно от текста; текст выводится интерполяцией Angular. Проверка доступа, выборка документов, поиск по смыслу и обращение к LLM выполняются на сервере. Сохранение и сброс истории диалога также можно перенести в API.

## Ошибки и подключение

Единый формат ошибки: `{ code, message, details?, traceId? }`. Для сетевых ошибок показывать повтор операции; для отказа доступа — понятное сообщение; для конфликта версии — обновление карточки. Не повторять автоматически решения и создания документов без ключа идемпотентности.

1. Добавить конфигурацию API и `provideHttpClient()`.
2. Реализовать `HttpEdmsRepository` с адаптацией серверных DTO к клиентским моделям.
3. Заменить provider `{ provide: EdmsRepository, useClass: MockEdmsRepository }` в `src/main.ts`.
4. Заменить `FOLDERS`/`PEOPLE` на справочники API, выделить серверную загрузку страницы списка и карточки.
5. Перевести файлы, предпросмотр, отчёты и лист согласования на серверные операции.
6. Удалить переключение демороли и браузерное сохранение; получать пользователя и права из авторизации.
7. Сохранить пользовательские E2E-сценарии, заменив подготовку данных и транспорт на тестовый API.

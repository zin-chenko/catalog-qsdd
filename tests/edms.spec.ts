import { expect, test } from '@playwright/test';

const primary = '/documents/orders/order-214/card';
test('catalog, search, sorting and real pagination', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Приказы', exact: true })).toBeVisible();
  await expect(page.locator('.pagination')).toContainText('1–20 из 128');
  await page.getByRole('button', { name: 'Следующая страница' }).click();
  await expect(page.locator('.pagination')).toContainText('21–40 из 128');
  await page.getByRole('button', { name: 'Дата', exact: false }).first().click();
  await expect(page.locator('th[aria-sort="ascending"]')).toContainText('Дата');
  await page.getByRole('textbox', { name: 'Поиск в текущей папке' }).fill('командировках');
  await expect(page.locator('.documents-table tbody tr')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Об утверждении Положения о служебных командировках', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Атрибуты' })).toBeVisible();
});

test('five tabs, contextual assistant citation, version comparison and file switching', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(primary);
  await expect(page.locator('.files-list .file-row')).toHaveCount(3);
  await page.locator('.files-list .file-row').nth(1).getByRole('button', { name: 'Просмотреть' }).click();
  await expect(page.locator('.attachment-text')).toContainText('ПОЛОЖЕНИЕ О СЛУЖЕБНЫХ КОМАНДИРОВКАХ');
  await page.getByRole('button', { name: 'Ключевые сроки', exact: true }).click();
  await page.locator('.message-references').last().getByRole('button', { name: 'п. 3', exact: true }).click();
  await expect(page.locator('.highlighted-paragraph')).toContainText('25.11.2026');
  await page.getByRole('button', { name: 'Маршрут', exact: true }).click();
  await expect(page.locator('.timeline-step')).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Участник', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Версии', exact: false }).first().click();
  await page.getByRole('button', { name: 'Сравнить выбранные (2)' }).click();
  await expect(page.locator('.diff-removed')).toContainText('ранее действующее');
  await expect(page.locator('.diff-added')).toContainText('87-П');
  await page.getByRole('button', { name: 'Закрыть диалог' }).click();
  await page
    .locator('.versions-table tbody tr')
    .last()
    .getByRole('button', { name: 'Открыть', exact: true })
    .click();
  await expect(page.locator('.version-banner')).toContainText('версии 1');
  await expect(page.locator('.document-paper')).toContainText('20.11.2026');
  expect(errors).toEqual([]);
});

test('create, edit, automatic version and persistence', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Создать документ', exact: true }).click();
  await page.getByRole('textbox', { name: 'Заголовок документа' }).fill('Тестовый приказ по архиву');
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(page.locator('.document-title')).toHaveText('Тестовый приказ по архиву');
  await page.getByRole('button', { name: 'Редактировать', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Текст документа' })
    .fill('Назначить ответственных за архив.\nОбеспечить передачу документов до 01.12.2026.');
  await page.getByRole('textbox', { name: 'Описание изменений' }).fill('Добавлены ответственные и срок');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.locator('.document-meta')).toContainText('Версия 2');
  await page.reload();
  await expect(page.locator('.document-title')).toHaveText('Тестовый приказ по архиву');
  await page.getByRole('button', { name: 'Отправить на согласование' }).click();
  await expect(page.locator('.document-meta app-status')).toHaveText('На согласовании');
});

test('approval changes status and route and persists', async ({ page }) => {
  await page.goto(primary);
  await page.getByRole('textbox', { name: 'Комментарий к решению' }).fill('Согласовано без замечаний');
  await page.getByRole('button', { name: 'Согласовать', exact: true }).click();
  await expect(page.locator('.document-meta app-status')).toHaveText('На подписании');
  await page.getByRole('button', { name: 'Маршрут', exact: true }).click();
  await expect(page.locator('.timeline-step.current')).toContainText('Подписание УКЭП');
  await expect(page.locator('.timeline')).toContainText('Согласовано без замечаний');
  await page.reload();
  await expect(page.locator('.document-meta app-status')).toHaveText('На подписании');
});

test('rejection requires a reason and closes the current stage', async ({ page }) => {
  await page.goto(primary);
  await page.getByRole('button', { name: 'Отклонить', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Отклонить документ', exact: true })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Причина отклонения' }).fill('Необходимо уточнить сроки');
  await page.getByRole('button', { name: 'Отклонить документ', exact: true }).click();
  await expect(page.locator('.document-meta app-status')).toHaveText('Отклонён');
});

test('delegation changes assignee and removes decision actions', async ({ page }) => {
  await page.goto(primary);
  await page.getByRole('button', { name: 'Делегировать', exact: true }).click();
  await page.getByRole('combobox', { name: 'Сотрудник' }).selectOption('Петрова О.В.');
  await page.getByRole('dialog').getByRole('button', { name: 'Делегировать', exact: true }).click();
  await expect(page.locator('.decision-panel')).toContainText('ожидает решения: Петрова О.В.');
  await expect(page.getByRole('button', { name: 'Согласовать', exact: true })).toHaveCount(0);
});

test('assistant creates a task that can be completed', async ({ page }) => {
  await page.goto(primary);
  await page.getByRole('button', { name: 'Ключевые сроки', exact: true }).click();
  await page.getByRole('button', { name: 'Создать поручение', exact: true }).last().click();
  await page.getByRole('textbox', { name: 'Содержание поручения' }).fill('Ознакомить отдел тестирования');
  await page.getByRole('combobox', { name: 'Исполнитель' }).selectOption('Белов С.И.');
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await page.getByRole('link', { name: 'Поручения', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ознакомить отдел тестирования' })).toBeVisible();
  await page.getByRole('button', { name: 'Завершить: Ознакомить отдел тестирования', exact: true }).click();
  await page.getByRole('button', { name: 'Завершённые', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ознакомить отдел тестирования' })).toBeVisible();
});

test('admin can change route; registered documents are read only', async ({ page }) => {
  await page.goto(primary);
  await page.getByRole('button', { name: 'ЕС Смирнова Е.' }).click();
  await page.getByRole('combobox', { name: 'Роль в демоверсии' }).selectOption('admin');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await page.getByRole('button', { name: 'Маршрут', exact: true }).click();
  await page.getByRole('button', { name: 'Доп. согласование', exact: true }).click();
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.locator('.timeline-step')).toHaveCount(6);
  await page.getByRole('button', { name: 'Согласовать', exact: true }).click();
  await expect(page.locator('.timeline-step.current')).toContainText('Дополнительное согласование');
  await expect(page.locator('.document-meta app-status')).toHaveText('На согласовании');
  await page.getByRole('button', { name: 'Согласовать', exact: true }).click();
  await expect(page.locator('.timeline-step.current')).toContainText('Подписание УКЭП');
  await page.goto('/documents/orders/order-1/card');
  await expect(page.getByText('Только чтение', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Редактировать', exact: true })).toHaveCount(0);
});

test('document download is a valid docx and uploaded file is previewable', async ({ page }) => {
  await page.goto(primary);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать Приказ_214-П.docx', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Приказ_214-П.docx');
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.getByRole('button', { name: 'ЕС Смирнова Е.' }).click();
  await page.getByRole('combobox', { name: 'Роль в демоверсии' }).selectOption('admin');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'Проверка.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: await (await import('node:fs/promises')).readFile(path!),
  });
  await expect(page.locator('.file-row')).toHaveCount(4);
  await page.locator('.file-row').last().getByRole('button', { name: 'Просмотреть' }).click();
  await expect(page.locator('.attachment-text')).toContainText('Утвердить Положение');
});

test('filters, global search, notification and reports', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Фильтры', exact: true }).click();
  await page.getByRole('combobox', { name: 'Статус', exact: true }).selectOption('На согласовании');
  await page.getByRole('button', { name: 'Применить' }).click();
  await expect(page.locator('.documents-table tbody tr')).toHaveCount(2);
  await page.getByRole('textbox', { name: 'Поиск по всем документам' }).fill('87-П');
  await page.getByRole('textbox', { name: 'Поиск по всем документам' }).press('Enter');
  await expect(page.locator('.documents-table')).toContainText('редакция 2024');
  await page.getByRole('button', { name: 'Уведомления', exact: true }).click();
  await page.getByRole('button', { name: 'Прочитать все', exact: true }).click();
  await expect(page.locator('.notification-count')).toHaveCount(0);
  await page.getByRole('button', { name: 'Уведомления', exact: true }).click();
  await page.getByRole('link', { name: 'Отчёты', exact: true }).click();
  await expect(page.locator('.metric-card')).toHaveCount(4);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Экспорт CSV' }).click();
  expect((await downloadPromise).suggestedFilename()).toContain('.csv');
});

test('mobile catalog and document do not overflow the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Открыть каталог' }).click();
  await expect(page.getByRole('complementary', { name: 'Каталог документов' })).toBeVisible();
  await page.getByRole('button', { name: 'Входящая корреспонденция 34', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Входящая корреспонденция', exact: true })).toBeVisible();
  await page.goto(primary);
  await expect(page.getByRole('heading', { name: 'Атрибуты' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'tmp/ui/mobile-card.png', fullPage: true });
});

test('visual snapshots of all five desktop tabs', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.documents-table tbody tr')).toHaveCount(20);
  await page.screenshot({ path: 'tmp/ui/list.png', fullPage: true });
  for (const tab of ['card', 'preview', 'route', 'versions']) {
    await page.goto(`/documents/orders/order-214/${tab}`);
    await expect(page.locator('.document-title')).toBeVisible();
    await page.screenshot({ path: `tmp/ui/${tab}.png`, fullPage: true });
  }
});

test('custom folders support nested documents and direct links after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Создать папку', exact: true }).click();
  await page.getByRole('textbox', { name: 'Название папки', exact: true }).fill('Проекты 2027');
  await page.getByRole('dialog').getByRole('button', { name: 'Создать папку', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Проекты 2027', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Создать подпапку в «Проекты 2027»', exact: true }).click();
  await page.getByRole('textbox', { name: 'Название папки', exact: true }).fill('Договоры');
  await page.getByRole('dialog').getByRole('button', { name: 'Создать папку', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Договоры', exact: true })).toBeVisible();
  await expect(page.locator('.breadcrumb')).toContainText('Проекты 2027 / Договоры');
  const folderUrl = page.url();
  await page.getByRole('button', { name: 'Создать документ', exact: true }).click();
  await page.getByRole('textbox', { name: 'Заголовок документа' }).fill('Договор проекта');
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(page.locator('.document-title')).toHaveText('Договор проекта');
  await page.reload();
  await expect(page.locator('.document-title')).toHaveText('Договор проекта');
  await page.goto(folderUrl);
  await expect(page.locator('.documents-table')).toContainText('Договор проекта');
});

test('route editor creates, duplicates and reorders independent routes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Маршруты', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Маршрутов пока нет', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Создать маршрут', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Название маршрута', exact: true }).fill('Договор');
  await dialog.getByRole('textbox', { name: 'Название шага', exact: true }).fill('Проверка');
  await dialog.getByRole('combobox', { name: 'Исполнитель', exact: true }).fill('Петрова О.В.');
  await dialog.getByRole('button', { name: 'Добавить шаг', exact: true }).click();
  await dialog.getByRole('textbox', { name: 'Название шага', exact: true }).nth(1).fill('Подпись');
  await dialog.getByRole('combobox', { name: 'Исполнитель', exact: true }).nth(1).fill('Иванов А.П.');
  await dialog.getByRole('combobox', { name: 'Тип шага', exact: true }).nth(1).selectOption('signing');
  await dialog.getByRole('button', { name: 'Создать маршрут', exact: true }).click();
  await expect(page.locator('.route-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Дублировать маршрут «Договор»', exact: true }).click();
  await dialog.getByRole('textbox', { name: 'Название маршрута', exact: true }).fill('Новый договор');
  await dialog.getByRole('button', { name: 'Поднять шаг 2', exact: true }).click();
  await dialog.getByRole('button', { name: 'Сохранить маршрут', exact: true }).click();
  await page.reload();
  const original = page
    .locator('.route-card')
    .filter({ has: page.getByRole('heading', { name: 'Договор', exact: true }) });
  const copy = page
    .locator('.route-card')
    .filter({ has: page.getByRole('heading', { name: 'Новый договор', exact: true }) });
  await expect(original.locator('li').first()).toContainText('Проверка');
  await expect(copy.locator('li').first()).toContainText('Подпись');
  await page.getByRole('button', { name: 'Редактировать маршрут «Договор»', exact: true }).click();
  await dialog.getByRole('textbox', { name: 'Название маршрута', exact: true }).fill('Не сохранять');
  await dialog.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(original).toBeVisible();
});

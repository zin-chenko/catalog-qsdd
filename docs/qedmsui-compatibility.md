# Конфигурация по образцу qedmsui

Ветка: `codex/qedmsui-dependencies`. Образец — локальные файлы `../qedmsui/QEDMSUI/package.json`, `.npmrc`, `angular.json`, `webpack.config.js`, `pnpm-lock.yaml`, `src/main.ts` и `../qedmsui/docker/Dockerfile-pbcui.txt`.

## Что перенесено

| Настройка                   | catalog-qsdd в этой ветке                                                  |
| --------------------------- | -------------------------------------------------------------------------- |
| Источник публичных пакетов  | `https://registry.npmjs.org/`                                              |
| Источник `@diasoft/*`       | `http://repolib-main.diasoft.ru:8081/repository/npm-public-and-diasoft/`   |
| Пакетный менеджер           | pnpm; версия 11.25.0 закреплена по установленной локально версии           |
| Фиксация дерева пакетов     | `pnpm-lock.yaml`, установка с `--frozen-lockfile`                          |
| Angular runtime / compiler  | 21.2.19, как в qedmsui                                                     |
| Angular CLI / build-angular | 21.2.21, как в qedmsui                                                     |
| TypeScript                  | 5.9.3                                                                      |
| ngx-build-plus              | 20.0.0, как в qedmsui                                                      |
| Module Federation           | 21.2.2, shared mappings и `publicPath: auto`                               |
| Сборка                      | Webpack `ngx-build-plus:browser`, singleBundle / keepStyles / bundleStyles |
| Запуск                      | `ng serve catalog-qsdd --port=4200 --live-reload=false`                    |
| Change detection            | Zone.js 0.15.1 и `provideZoneChangeDetection()`                            |
| Production                  | `pnpm run prod` → `pnpm run build`, результат `dist/catalog-qsdd`          |

Rspack и Module Federation runtime/enhanced закреплены через overrides по версиям lock-файла qedmsui. Это предотвращает выбор новых несовместимых peer-зависимостей. Значения `allowBuilds` заданы явно: в файле-образце вместо логических значений остались текстовые заглушки. `uniqueName` Webpack сделан постоянным `catalogQsdd` вместо даты сборки, чтобы повторные сборки были воспроизводимыми.

## Установка и запуск

Нужен Node.js 22.12+ (проверено на 22.22.0) и pnpm 11.25.0. Указание Node 18 в документации qedmsui устарело относительно используемого Angular 21; Docker-образ qedmsui также использует Node 22.

```sh
pnpm install --frozen-lockfile
pnpm start
pnpm run prod
pnpm test
```

Обычная установка использует маршрутизацию из `.npmrc`: публичные пакеты — npmjs, `@diasoft/*` — Nexus. Это осознанное отличие от qedmsui: при установке Nexus вернул 404 для публичной зависимости каталога `mammoth`. Пока QPalette не установлена, демоверсию можно установить без корпоративной сети:

```sh
pnpm install --frozen-lockfile --registry=https://registry.npmjs.org/
```

Переопределение общего registry действует только на эту команду; scoped registry `@diasoft` остаётся корпоративным. Lock-файл содержит версии и integrity, без жёсткой привязки tarball URL к npmjs. В проект не копируются npm-токены или персональные настройки авторизации.

Docker также использует pnpm, npmjs для публичных пакетов и scoped Nexus из `.npmrc`. Демоверсия без установленных зависимостей QPalette собирается без корпоративной сети:

```sh
docker compose build --build-arg NPM_REGISTRY=https://registry.npmjs.org/
docker compose up -d
```

## Границы совместимости

Базовый режим переносит установку, сборку и загрузку используемых зависимостей. Дополнительно подготовлен отдельный entry point с `createApplication()` и `provideQAuth()` для платформенной оболочки Q.Palette — см. [qpalette-integration.md](qpalette-integration.md). Его зависимости устанавливаются отдельной командой после появления доступа к Nexus. Сборка и вход через платформу пока не проверены. Продуктовые библиотеки qedmsui не перенесены.

Angular и остальные библиотеки входят в собственные JS-бандлы, загружаемые с сервера приложения. В `webpack.config.js` qedmsui нет remote URL или списка shared Angular-пакетов; такая же конфигурация сохранена здесь. Отдельный CDN для Angular не вводится. Шрифты и файлы приложения также обслуживаются локально.

Контейнер сохраняет самостоятельный nginx и образы Docker Hub. Корпоративный рантайм `release/qpalette`, структура `Q*UI`, rootapp и Jenkins-бандлер не перенесены: это отдельная интеграция с платформенной оболочкой, а не источник npm-пакетов. Нет отдельных продуктовых виджетов, поэтому `prod` собирает только приложение каталога.

## Проверка

Корпоративный Nexus недоступен через DNS в текущем окружении. С разрешения пользователя зависимости для проверки получены через npmjs. Установка непосредственно из Nexus требует повторной проверки после подключения корпоративной сети.

Пройдены: установка по frozen lockfile, production-сборка, Docker-сборка с явным `NPM_REGISTRY=https://registry.npmjs.org/`, 15 браузерных сценариев на отдельном порту 4300, 12 тестов репозитория данных, проверка форматирования. `pnpm peers check` не обнаружил конфликтов. Для тестирования на другом порту можно задать `E2E_PORT`.

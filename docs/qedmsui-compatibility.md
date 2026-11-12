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

Обычная установка использует маршрутизацию из `.npmrc`: публичные пакеты — npmjs, `@diasoft/*` — Nexus. В CI все пакеты загружаются через Nexus, как в qedmsui. QPalette сохранена в общем manifest/lockfile, поэтому чистая установка требует доступа к корпоративной сети, даже если затем запускается демо:

```sh
pnpm install --frozen-lockfile --registry=https://registry.npmjs.org/
```

Переопределение общего registry действует только на эту команду; scoped registry `@diasoft` остаётся корпоративным. Lock-файл содержит версии и integrity, без жёсткой привязки tarball URL к npmjs. В проект не копируются npm-токены или персональные настройки авторизации.

Docker также использует pnpm, npmjs для публичных пакетов и scoped Nexus из `.npmrc`. Для установки общих зависимостей в build-контейнере теперь нужен доступ к Nexus:

```sh
docker compose build --build-arg NPM_REGISTRY=https://registry.npmjs.org/
docker compose up -d
```

## Границы совместимости

Базовый режим переносит установку, сборку и загрузку используемых зависимостей. Дополнительно подготовлен отдельный entry point с `createApplication()` и `provideQAuth()` для платформенной оболочки Q.Palette — см. [qpalette-integration.md](qpalette-integration.md). Зависимости QPalette установлены, production-сборка проходит. Вход через платформу пока не проверен. Продуктовые библиотеки qedmsui не перенесены.

Angular и остальные библиотеки входят в собственные JS-бандлы, загружаемые с сервера приложения. В `webpack.config.js` qedmsui нет remote URL или списка shared Angular-пакетов; такая же конфигурация сохранена здесь. Отдельный CDN для Angular не вводится. Шрифты и файлы приложения также обслуживаются локально.

Локальный контейнер сохраняет самостоятельный nginx и образы Docker Hub. Для Jenkins отдельно подготовлены корпоративный рантайм `release/qpalette`, упаковка в `Q*UI`, минимальный rootapp и вызов `dsMsaPipeline` — см. [jenkins.md](jenkins.md). В подготовленном CI-контексте `prod` собирает QPalette-версию каталога; локальная команда `prod` по-прежнему собирает демо. Отдельных продуктовых виджетов нет.

## Проверка

Корпоративный Nexus доступен: пакеты QPalette 8.1.3 получены из него, публичные зависимости — из npmjs. Пакет извлечения текста DOCX, ранее вызывавший HTTP 404 в Nexus, удалён из manifest и lockfile. Полную установку всех оставшихся зависимостей через Nexus нужно проверить в Jenkins.

До добавления QPalette были пройдены frozen install, production- и Docker-сборки демоверсии, 15 браузерных сценариев и 12 тестов репозитория данных. После установки QPalette повторно пройдены production-сборка платформенного входа, 15 браузерных сценариев деморежима и проверка peer-зависимостей. Начальный объём QPalette: 975.36 kB, оценка передачи 232.90 kB. Для тестирования на другом порту можно задать `E2E_PORT`.

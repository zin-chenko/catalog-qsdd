import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideQAuth } from '@diasoft/qpalette-auth';
import { provideQCore } from '@diasoft/qpalette-core';
import { createApplication, provideQWebComponent, QEventsService } from '@diasoft/qpalette-visual';
import { routes } from '../app/app.routes';
import { EdmsRepository, MockEdmsRepository } from '../app/core/edms.repository';
import { QPaletteAppComponent } from './qpalette-app.component';

// The QPalette host owns login, session refresh and logout. This entry has no demo fallback.
createApplication()
  .bootstrap(QPaletteAppComponent, [
    provideZoneChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptorsFromDi()),
    provideQCore(),
    provideQAuth(),
    provideQWebComponent(),
    QEventsService,
    { provide: EdmsRepository, useClass: MockEdmsRepository },
  ])
  .catch(() => {
    // Do not log authentication responses or tokens.
    console.error('Не удалось запустить каталог в QPalette. Проверьте конфигурацию оболочки.');
  });

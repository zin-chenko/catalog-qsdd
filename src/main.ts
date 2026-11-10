import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { EdmsRepository, MockEdmsRepository } from './app/core/edms.repository';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    { provide: EdmsRepository, useClass: MockEdmsRepository },
  ],
}).catch((error) => console.error(error));

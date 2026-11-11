import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { EventsInternalService, QEventsService, QWebComponent } from '@diasoft/qpalette-visual';
import { AppComponent } from '../app/app.component';

// Keep the platform event bridge outside the catalog so demo builds do not import QPalette.
@Component({
  selector: 'catalog-qpalette-root',
  standalone: true,
  imports: [AppComponent],
  template: '<app-root />',
})
export class QPaletteAppComponent extends QWebComponent {
  constructor(
    override readonly eventsService: QEventsService,
    override readonly internalService: EventsInternalService,
    override readonly router: Router,
  ) {
    super(eventsService, internalService, router);
  }
}

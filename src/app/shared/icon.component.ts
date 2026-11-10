import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.65"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path [attr.d]="paths[name()] || paths['file']" />
  </svg>`,
  styles: [
    ':host{display:inline-flex;width:18px;height:18px;flex:none;vertical-align:middle}svg{width:100%;height:100%}',
  ],
})
export class IconComponent {
  readonly name = input('file');
  readonly paths: Record<string, string> = {
    search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    folder: 'M3 6h6l2 3h10v11H3z',
    archive: 'M3 3h18v5H3zM5 8v13h14V8M10 12h4',
    'check-square': 'M21 11v10H3V3h12M8 10l4 4L22 4',
    filter: 'M4 5h16M7 12h10M10 19h4',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
    plus: 'M12 5v14M5 12h14',
    close: 'M6 6l12 12M6 18L18 6',
    chevron: 'M9 5l7 7-7 7',
    down: 'M5 9l7 7 7-7',
    download: 'M12 3v12M7 10l5 5 5-5M4 17v4h16v-4',
    sparkles:
      'M9 2l2.5 6.5L18 11l-6.5 2.5L9 20l-2.5-6.5L0 11l6.5-2.5zM19 15l1.2 3.2L23 19l-2.8 1L19 23l-1-3-3-1 3-.8z',
    send: 'M22 2L9 15M22 2l-7 20-6-7-7-6z',
    file: 'M14 2H4v20h16V8zM14 2v6h6',
    check: 'M5 12l4 4L20 5',
    clock: 'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    menu: 'M4 6h16M4 12h16M4 18h16',
    arrow: 'M19 12H5M12 5l-7 7 7 7',
    edit: 'M16 3l5 5-12 12-6 1 1-6zM13 6l5 5',
    chart: 'M4 3v18h18M8 16v-5M13 16V6M18 16v-8',
    logout: 'M9 3H3v18h6M9 12h13M17 7l5 5-5 5',
    shield: 'M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6zM8 12l3 3 5-6',
    copy: 'M8 8h13v13H8zM16 8V3H3v13h5',
    minus: 'M5 12h14',
  };
}

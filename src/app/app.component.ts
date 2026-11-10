import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { EdmsStore } from './core/edms.store';
import { FOLDERS, PEOPLE } from './core/mock-data';
import { STATUSES } from './core/models';
import { IconComponent } from './shared/icon.component';
import { DialogComponent } from './shared/dialog.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, FormsModule, IconComponent, DialogComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly store = inject(EdmsStore);
  readonly router = inject(Router);
  readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  readonly folderId = computed(() => this.url().split('?')[0].split('/')[2] || 'orders');
  readonly folder = computed(() => FOLDERS.find((f) => f.id === this.folderId()) ?? FOLDERS[3]);
  readonly isTasks = computed(() => this.url().startsWith('/tasks'));
  readonly isReports = computed(() => this.url().startsWith('/reports'));
  readonly notifications = computed(() => this.store.state()?.notifications ?? []);
  readonly unread = computed(() => this.notifications().filter((n) => !n.read).length);
  readonly sidebarOpen = signal(false);
  readonly filtersOpen = signal(false);
  readonly notificationsOpen = signal(false);
  readonly profileOpen = signal(false);
  readonly folders = FOLDERS;
  readonly statuses = STATUSES;
  readonly people = PEOPLE;
  readonly types = computed(() => [...new Set(this.store.documents().map((d) => d.type))]);
  globalQuery = '';
  folderQuery = '';
  status = '';
  year = '2026';
  author = '';
  type = '';
  department = '';
  tag = '';
  from = '';
  to = '';
  profileRole: 'reviewer' | 'admin' = 'reviewer';
  substitute = '';
  constructor() {
    void this.store.load();
    effect(() => {
      const query = new URLSearchParams(this.url().split('?')[1] ?? '');
      this.folderQuery = query.get('scope') === 'all' ? '' : (query.get('q') ?? '');
      this.globalQuery = query.get('scope') === 'all' ? (query.get('q') ?? '') : '';
      this.status = query.get('status') ?? '';
      this.year = query.get('year') ?? '';
      this.author = query.get('author') ?? '';
      this.type = query.get('type') ?? '';
      this.department = query.get('department') ?? '';
      this.tag = query.get('tag') ?? '';
      this.from = query.get('from') ?? '';
      this.to = query.get('to') ?? '';
    });
  }
  count(folderId: string): number {
    if (folderId === 'tasks') return this.store.tasks().filter((t) => !t.done).length;
    if (folderId === 'center')
      return this.store
        .documents()
        .filter((d) => d.status === 'На согласовании' && d.assignee === this.store.user().name).length;
    return this.store.documents().filter((d) => d.folderId === folderId).length;
  }
  openFolder(id: string): void {
    this.folderQuery = '';
    this.globalQuery = '';
    this.status = '';
    this.year = id === 'archive' ? '' : '2026';
    this.author = '';
    this.type = '';
    this.department = '';
    this.tag = '';
    this.from = '';
    this.to = '';
    this.sidebarOpen.set(false);
    void this.router.navigate(id === 'tasks' ? ['/tasks'] : ['/documents', id], {
      queryParams: { year: this.year || null },
    });
  }
  applyFilters(): void {
    void this.router.navigate(['/documents', this.folder().id], {
      queryParams: {
        q: this.folderQuery || null,
        status: this.status || null,
        year: this.year || null,
        author: this.author || null,
        type: this.type || null,
        department: this.department || null,
        tag: this.tag || null,
        from: this.from || null,
        to: this.to || null,
      },
    });
  }
  searchAll(): void {
    void this.router.navigate(['/documents', 'center'], {
      queryParams: { q: this.globalQuery || null, scope: 'all' },
    });
  }
  resetFilters(): void {
    this.status = '';
    this.year = '';
    this.author = '';
    this.type = '';
    this.from = '';
    this.to = '';
    this.folderQuery = '';
    this.department = '';
    this.tag = '';
    this.applyFilters();
  }
  openNotification(id: string): void {
    const doc = this.store.documents().find((d) => d.id === id);
    if (doc) void this.router.navigate(['/documents', doc.folderId, id, 'card']);
    this.notificationsOpen.set(false);
  }
  showProfile(): void {
    this.profileRole = this.store.user().role;
    this.substitute = this.store.user().substitute;
    this.profileOpen.set(true);
  }
  async saveProfile(): Promise<void> {
    await this.store.run(
      () =>
        this.store.api.updateUser({
          ...this.store.user(),
          role: this.profileRole,
          substitute: this.substitute,
        }),
      'Профиль обновлён',
    );
    this.profileOpen.set(false);
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EdmsStore } from '../../core/edms.store';
import { PEOPLE } from '../../core/mock-data';
import { WorkflowRoute, WorkflowStep, WorkflowStepType } from '../../core/models';
import { DialogComponent } from '../../shared/dialog.component';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-routes',
  imports: [FormsModule, DialogComponent, IconComponent],
  templateUrl: './routes.component.html',
  styleUrl: './routes.component.css',
})
export class RoutesComponent {
  readonly store = inject(EdmsStore);
  readonly people = PEOPLE;
  readonly search = signal('');
  readonly editorOpen = signal(false);
  readonly stepTypes: Record<WorkflowStepType, string> = { approval: 'Согласование', signing: 'Подписание' };
  readonly routes = computed(() => {
    const query = this.search().trim().toLocaleLowerCase('ru');
    return this.store
      .workflowRoutes()
      .filter((r) =>
        [r.name, ...r.steps.flatMap((s) => [s.name, s.assignee, this.stepTypes[s.type]])]
          .join(' ')
          .toLocaleLowerCase('ru')
          .includes(query),
      );
  });
  editingId?: string;
  routeName = '';
  steps: WorkflowStep[] = [];
  error = '';
  newStep(): WorkflowStep {
    return { id: crypto.randomUUID(), name: '', assignee: '', type: 'approval' };
  }
  openEditor(route?: WorkflowRoute): void {
    this.editingId = route?.id;
    this.routeName = route?.name ?? '';
    this.steps = route ? structuredClone(route.steps) : [this.newStep()];
    this.error = '';
    this.editorOpen.set(true);
  }
  addStep(): void {
    this.steps = [...this.steps, this.newStep()];
  }
  removeStep(index: number): void {
    this.steps = this.steps.filter((_, i) => i !== index);
  }
  moveStep(index: number, offset: number): void {
    const next = index + offset;
    if (next < 0 || next >= this.steps.length) return;
    const steps = [...this.steps];
    [steps[index], steps[next]] = [steps[next], steps[index]];
    this.steps = steps;
  }
  closeEditor(): void {
    if (!this.store.busy()) this.editorOpen.set(false);
  }
  async save(): Promise<void> {
    if (this.store.busy()) return;
    this.error = '';
    const saved = await this.store.run(
      () => this.store.api.saveWorkflowRoute({ name: this.routeName, steps: this.steps }, this.editingId),
      this.editingId ? 'Маршрут сохранён' : 'Маршрут создан',
    );
    if (saved) {
      this.editorOpen.set(false);
      this.search.set('');
    } else this.error = this.store.toast()?.text ?? 'Не удалось сохранить маршрут.';
  }
  async duplicate(route: WorkflowRoute): Promise<void> {
    const copy = await this.store.run(
      () => this.store.api.duplicateWorkflowRoute(route.id),
      'Копия маршрута создана',
    );
    if (copy) {
      this.search.set('');
      this.openEditor(copy);
    }
  }
}

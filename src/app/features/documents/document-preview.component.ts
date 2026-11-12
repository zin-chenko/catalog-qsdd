import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { EdmsDocument, formatDate } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';
import { DocumentFilesService } from '../../core/document-files.service';
import { EdmsStore } from '../../core/edms.store';

@Component({
  selector: 'app-document-preview',
  imports: [IconComponent],
  templateUrl: './document-preview.component.html',
})
export class DocumentPreviewComponent {
  readonly document = input.required<EdmsDocument>();
  readonly fileId = input('main');
  readonly version = input<number | null>(null);
  readonly highlight = input<number | null>(null);
  readonly fileChanged = output<string>();
  readonly currentVersion = output<void>();
  readonly zoom = signal(100);
  readonly files = inject(DocumentFilesService);
  readonly store = inject(EdmsStore);
  private readonly sanitizer = inject(DomSanitizer);
  readonly selectedFile = computed(
    () => this.document().files.find((f) => f.id === this.fileId()) ?? this.document().files[0],
  );
  readonly previewUnavailable = computed(() => {
    const file = this.selectedFile();
    return file.kind === 'DOCX' && !!file.dataUrl && !file.text;
  });
  readonly selectedVersion = computed(
    () => this.document().versions.find((v) => v.number === this.version()) ?? this.document().versions[0],
  );
  readonly pdfUrl = computed(() => {
    const file = this.selectedFile();
    // Only locally read PDF bytes or the bundled fixture may enter this resource URL.
    const value = file.dataUrl?.startsWith('data:application/pdf;base64,')
      ? file.dataUrl
      : '/mock/approval-sheet.pdf';
    return this.sanitizer.bypassSecurityTrustResourceUrl(value + '#zoom=' + this.zoom());
  });
  readonly date = formatDate;
  async download(): Promise<void> {
    try {
      await this.files.download(
        {
          ...this.document(),
          title: this.selectedVersion().title,
          paragraphs: this.selectedVersion().paragraphs,
        },
        this.selectedFile(),
      );
    } catch {
      this.store.notify('Не удалось подготовить файл для скачивания.', true);
    }
  }
}

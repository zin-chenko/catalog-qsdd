import { Injectable } from '@angular/core';
import { DocumentFile, EdmsDocument } from './models';

@Injectable({ providedIn: 'root' })
export class DocumentFilesService {
  async read(file: File): Promise<DocumentFile> {
    if (file.size > 2 * 1024 * 1024) throw new Error('Для демоверсии выберите файл размером до 2 МБ.');
    const extension = file.name.split('.').pop()?.toLowerCase();
    const kind =
      extension === 'docx'
        ? 'DOCX'
        : extension === 'pdf'
          ? 'PDF'
          : ['png', 'jpg', 'jpeg', 'webp'].includes(extension ?? '')
            ? 'IMG'
            : null;
    if (!kind) throw new Error('Поддерживаются DOCX, PDF, PNG, JPEG и WebP.');
    let dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    if (kind === 'PDF') dataUrl = dataUrl.replace(/^data:[^;]*;/, 'data:application/pdf;');
    let text: string | undefined;
    if (kind === 'DOCX') {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      text = result.value;
    }
    return {
      id: crypto.randomUUID(),
      name: file.name,
      size: `${Math.max(1, Math.round(file.size / 1024))} КБ`,
      kind,
      dataUrl,
      text,
    };
  }
  async download(doc: EdmsDocument, file: DocumentFile): Promise<void> {
    if (file.dataUrl) {
      this.click(file.dataUrl, file.name);
      return;
    }
    if (file.kind === 'PDF') {
      this.click('/mock/approval-sheet.pdf', file.name);
      return;
    }
    const { zipSync, strToU8 } = await import('fflate');
    const escape = (text: string) =>
      text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    const lines = file.text?.split('\n') ?? [
      'БАНК',
      'ПРИКАЗ',
      `№ ${doc.number} от ${doc.date.split('-').reverse().join('.')}`,
      doc.title,
      ...doc.paragraphs.map((p, i) => `${i + 1}. ${p}`),
      `Подписант: ${doc.signer}`,
    ];
    const bytes = zipSync({
      '[Content_Types].xml': strToU8(
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
      ),
      '_rels/.rels': strToU8(
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      ),
      'word/document.xml': strToU8(
        `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${lines.map((line) => `<w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${escape(line)}</w:t></w:r></w:p>`).join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`,
      ),
    });
    const blob = new Blob([new Uint8Array(bytes)], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const url = URL.createObjectURL(blob);
    this.click(url, file.name);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  private click(href: string, name: string): void {
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    a.click();
  }
}

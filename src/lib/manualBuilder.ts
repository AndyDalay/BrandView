import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { StoredManual, StoredPage } from './db';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const IMG_RE = /\.(png|jpe?g|webp|svg|gif)$/i;
const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

function newId() {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function titleFromName(s: string) {
  const t = s
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return t || 'Manual';
}

// Orden: portada primero, page-xx por número, contraportada al final
function rank(name: string) {
  const key = name.replace(IMG_RE, '').toLowerCase();
  if (key === 'portada') return -1e15;
  if (key === 'contraportada') return 1e15;
  const m = key.match(/(\d+)/);
  return m ? Number(m[1]) : 1e9;
}

function dimsOf(file: Blob): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth || 1000, h: img.naturalHeight || 1400 });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ w: 1000, h: 1400 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export async function manualFromPdf(file: File, onProgress: (p: number) => void): Promise<StoredManual> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const paginas: StoredPage[] = [];

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: Math.min(2, 1600 / base.width) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Este navegador no puede renderizar el PDF.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar una página'))), 'image/jpeg', 0.9)
    );
    paginas.push({ blob, w: canvas.width, h: canvas.height });
    page.cleanup();
    onProgress(n / doc.numPages);
  }

  if (!paginas.length) throw new Error('El PDF no tiene páginas.');
  return { id: newId(), nombre: titleFromName(file.name), createdAt: Date.now(), paginas };
}

export async function manualFromFolder(files: File[]): Promise<StoredManual> {
  const imgs = files
    .filter((f) => IMG_RE.test(f.name))
    .sort((a, b) => rank(a.name) - rank(b.name) || collator.compare(a.name, b.name));
  if (!imgs.length) throw new Error('La carpeta no contiene imágenes (png, jpg, webp, svg o gif).');

  const rel = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath;
  const folder = rel ? rel.split('/')[0] : 'Manual';

  const paginas: StoredPage[] = [];
  for (const f of imgs) {
    const { w, h } = await dimsOf(f);
    paginas.push({ blob: f, w, h });
  }
  return { id: newId(), nombre: titleFromName(folder), createdAt: Date.now(), paginas };
}

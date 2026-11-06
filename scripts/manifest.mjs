import fs from 'node:fs';
import path from 'node:path';

const IMG = /\.(png|jpe?g|webp|svg|gif)$/i;

// Orden de páginas: portada, page-01, page-02, ... contraportada
function rank(key) {
  if (key === 'portada') return -1;
  if (key === 'contraportada') return Number.MAX_SAFE_INTEGER;
  const m = key.match(/^page-(\d+)$/);
  if (m) return Number(m[1]);
  return 1e9;
}

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => IMG.test(f)).sort();
}

function titleFromId(id) {
  return id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Lee ancho y alto reales de una imagen leyendo solo su cabecera (sin dependencias).
// Soporta PNG, JPEG, GIF, WEBP y SVG. Devuelve null si no puede leerlo.
export function readDims(file) {
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch {
    return null;
  }
  const ext = path.extname(file).toLowerCase();

  if (ext === '.png' && buf.length >= 24) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }

  if (ext === '.gif' && buf.length >= 10) {
    return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
  }

  if ((ext === '.jpg' || ext === '.jpeg') && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker === 0xff) { i++; continue; }
      const isSOF = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isSOF) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return null;
  }

  if (ext === '.webp' && buf.toString('ascii', 0, 4) === 'RIFF') {
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') {
      return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') {
      return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
    }
    return null;
  }

  if (ext === '.svg') {
    const text = buf.toString('utf8');
    const tag = text.match(/<svg[^>]*>/i)?.[0] ?? '';
    const attr = (name) => {
      const m = tag.match(new RegExp(`\\s${name}="([\\d.]+)(px)?"`));
      return m ? parseFloat(m[1]) : null;
    };
    const w = attr('width');
    const h = attr('height');
    if (w && h) return { w, h };
    const vb = tag.match(/viewBox="([^"]+)"/);
    if (vb) {
      const [, , vw, vh] = vb[1].trim().split(/[\s,]+/).map(Number);
      if (vw && vh) return { w: vw, h: vh };
    }
    return null;
  }

  return null;
}

export function buildManifest(root) {
  const galeria = path.join(root, 'public', 'galeria');
  const manuales = [];

  if (fs.existsSync(galeria)) {
    for (const entry of fs.readdirSync(galeria, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(galeria, entry.name);
      const files = listImages(dir)
        .map((f) => ({ f, key: f.replace(IMG, '').toLowerCase() }))
        .sort((a, b) => rank(a.key) - rank(b.key) || a.f.localeCompare(b.f));
      if (!files.length) continue;

      const nameFile = path.join(dir, 'nombre.txt');
      const nombre = fs.existsSync(nameFile)
        ? fs.readFileSync(nameFile, 'utf8').trim()
        : titleFromId(entry.name);

      const base = `/galeria/${encodeURIComponent(entry.name)}/`;
      const portadaDims = readDims(path.join(dir, files[0].f)) ?? { w: 3, h: 4 };
      // Todas las páginas de un manual comparten resolución: usamos la primera página interior
      const pageFile = files[1] ?? files[0];
      const pageDims = readDims(path.join(dir, pageFile.f)) ?? portadaDims;

      manuales.push({
        id: entry.name,
        nombre,
        portada: base + encodeURIComponent(files[0].f),
        portadaW: portadaDims.w,
        portadaH: portadaDims.h,
        paginaW: pageDims.w,
        paginaH: pageDims.h,
        paginas: files.map((x) => base + encodeURIComponent(x.f)),
      });
    }
  }

  manuales.sort((a, b) => a.nombre.localeCompare(b.nombre));
  const ads = listImages(path.join(root, 'public', 'ads')).map((f) => `/ads/${encodeURIComponent(f)}`);
  return { manuales, ads };
}

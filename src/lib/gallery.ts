import { listManuals, type StoredManual } from './db';
import { loadRemote } from './share';

export interface Manual {
  id: string;
  nombre: string;
  portada: string;
  portadaW: number;
  portadaH: number;
  paginaW: number;
  paginaH: number;
  paginas: string[];
  nuevo?: boolean; // subido recientemente y aún no abierto
  local?: boolean; // subido desde esta app (IndexedDB), se puede borrar de verdad
  remoto?: boolean; // compartido en Supabase; se borra de la BD y del Storage (solo el dueño)
}

export interface Gallery {
  manuales: Manual[];
  ads: string[];
}

const SEEN_KEY = 'gbv-vistos';
const ORDEN_KEY = 'gbv-orden'; // orden elegido por el usuario al arrastrar
const OCULTOS_KEY = 'gbv-ocultos'; // manuales de /public que el usuario ha quitado de su galería

function readList(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeList(key: string, value: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento disponible */
  }
}

export function isSeen(id: string): boolean {
  return readList(SEEN_KEY).includes(id);
}

export function markSeen(id: string) {
  writeList(SEEN_KEY, [...new Set([...readList(SEEN_KEY), id])]);
}

export function getOrden(): string[] {
  return readList(ORDEN_KEY);
}

export function saveOrden(ids: string[]) {
  writeList(ORDEN_KEY, ids);
}

export function hideManual(id: string) {
  writeList(OCULTOS_KEY, [...new Set([...readList(OCULTOS_KEY), id])]);
}

// Aplica el orden guardado. Los manuales nuevos (aún sin posición guardada) van primero.
export function ordenar(manuales: Manual[], orden: string[]): Manual[] {
  const byId = new Map(manuales.map((m) => [m.id, m]));
  const known = new Set(orden);
  const fresh = manuales.filter((m) => !known.has(m.id));
  const rest: Manual[] = [];
  for (const id of orden) {
    const m = byId.get(id);
    if (m) rest.push(m);
  }
  return [...fresh, ...rest];
}

function localToManual(m: StoredManual): Manual {
  const urls = m.paginas.map((p) => URL.createObjectURL(p.blob));
  const first = m.paginas[0];
  const second = m.paginas[1] ?? first;
  return {
    id: m.id,
    nombre: m.nombre,
    portada: urls[0],
    portadaW: first.w,
    portadaH: first.h,
    paginaW: second.w,
    paginaH: second.h,
    paginas: urls,
    nuevo: !isSeen(m.id),
    local: true,
  };
}

export async function loadGallery(): Promise<Gallery> {
  const [res, locales, remotos] = await Promise.all([
    fetch('/galeria/manifest.json', { cache: 'no-store' }),
    listManuals().catch(() => [] as StoredManual[]),
    loadRemote().catch(() => [] as Manual[]),
  ]);
  if (!res.ok) throw new Error('No se pudo leer la galería.');
  const base = (await res.json()) as Gallery;
  const ocultos = new Set(readList(OCULTOS_KEY));
  const remoteIds = new Set(remotos.map((m) => m.id));
  // Un manual local ya compartido se muestra solo una vez (la versión remota)
  const locals = [...locales]
    .filter((l) => !remoteIds.has(l.id))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(localToManual);
  return {
    manuales: [...remotos, ...locals, ...base.manuales.filter((m) => !ocultos.has(m.id))],
    ads: base.ads,
  };
}

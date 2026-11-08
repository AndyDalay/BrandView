import { supabase } from '@/lib/supabaseClient';

// Perfiles y avatares (P6). Tabla `perfiles` y bucket `avatares` según supabase/migrations/0004_perfiles.sql.
// Rutas: `<uid>/256.<ext>` y `<uid>/96.<ext>`. La versión (avatar_version) cambia la URL con ?v= para evitar caché vieja.

const BUCKET = 'avatares';
export const NOMBRE_MIN = 2;
export const NOMBRE_MAX = 40;

export interface Perfil {
  id: string;
  nombre: string;
  avatarPath: string | null;
  avatarVersion: number;
}

export async function getPerfil(uid: string): Promise<Perfil | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, avatar_path, avatar_version')
    .eq('id', uid)
    .maybeSingle();
  if (error) throw new Error('No se pudo cargar el perfil.');
  if (!data) return null;
  return {
    id: data.id as string,
    nombre: data.nombre as string,
    avatarPath: (data.avatar_path as string | null) ?? null,
    avatarVersion: (data.avatar_version as number) ?? 0,
  };
}

/** Nombre visible: 2–40 caracteres tras recortar espacios. Lanza un error con mensaje en español. */
export function validarNombre(nombre: string): string {
  const limpio = nombre.trim();
  if (limpio.length < NOMBRE_MIN || limpio.length > NOMBRE_MAX) {
    throw new Error(`El nombre debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres.`);
  }
  return limpio;
}

export async function guardarNombre(uid: string, nombre: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const limpio = validarNombre(nombre);
  const { data, error } = await supabase
    .from('perfiles')
    .update({ nombre: limpio, updated_at: new Date().toISOString() })
    .eq('id', uid)
    .select('id');
  if (error) throw new Error('No se pudo guardar el nombre.');
  if (!data || data.length === 0) throw new Error('No tienes permiso para editar este perfil.');
}

function extension(blob: Blob): string {
  return blob.type === 'image/webp' ? 'webp' : 'jpg';
}

/** Sube las dos versiones y actualiza avatar_path y avatar_version. Devuelve la nueva versión. */
export async function guardarAvatar(uid: string, grande: Blob, mini: Blob): Promise<number> {
  if (!supabase) throw new Error('Supabase no está configurado.');

  const ext = extension(grande);
  // Nombre único por subida: así nunca hay "The resource already exists" (no depende de borrar antes).
  const stamp = Date.now();
  const pathGrande = `${uid}/${stamp}-256.${ext}`;
  const pathMini = `${uid}/${stamp}-96.${ext}`;

  const subir = async (path: string, blob: Blob) => {
    const { error } = await supabase!.storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type,
      cacheControl: '3600',
    });
    if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);
  };
  await subir(pathGrande, grande);
  await subir(pathMini, mini);

  const actual = await getPerfil(uid);
  const version = (actual?.avatarVersion ?? 0) + 1;
  const { data, error } = await supabase
    .from('perfiles')
    .update({ avatar_path: pathGrande, avatar_version: version, updated_at: new Date().toISOString() })
    .eq('id', uid)
    .select('id');
  if (error) throw new Error('La foto se subió, pero no se pudo guardar en el perfil.');
  if (!data || data.length === 0) throw new Error('No tienes permiso para editar este perfil.');

  // Limpieza best-effort de la foto anterior (si falla, no pasa nada: solo queda un archivo sin usar)
  if (actual?.avatarPath && actual.avatarPath !== pathGrande) {
    await supabase.storage.from(BUCKET).remove([actual.avatarPath, miniPath(actual.avatarPath)]);
  }
  return version;
}

/** Ruta de la versión de 96 px a partir de la de 256 px (también para rutas antiguas `uid/256.ext`). */
function miniPath(path: string): string {
  return path.replace(/256\.(\w+)$/, '96.$1');
}

/** URL pública de la foto en el tamaño pedido. Devuelve null si el usuario no tiene foto. */
export function urlAvatar(perfil: Perfil, tamano: 'grande' | 'mini'): string | null {
  if (!supabase || !perfil.avatarPath) return null;
  const path = tamano === 'grande' ? perfil.avatarPath : miniPath(perfil.avatarPath);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${perfil.avatarVersion}`;
}

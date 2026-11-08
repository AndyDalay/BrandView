import { supabase } from '@/lib/supabaseClient';
import { ensureSession } from '@/lib/share';
import { urlAvatar } from '@/lib/perfiles';

// Capa de datos de comentarios (T3 texto, T5 audio). Tabla `comentarios` según supabase/migrations/0003_comentarios.sql.
export const TEXTO_MAX = 500;
const BUCKET_AUDIO = 'comentarios';

export type EstadoComentario = 'pendiente' | 'transcribiendo' | 'listo' | 'error';

export interface Comentario {
  id: string;
  manualId: string;
  pagina: number;
  x: number; // 0–1 respecto al ancho de la vista del libro
  y: number; // 0–1 respecto al alto de la vista del libro
  texto: string;
  autorId: string;
  autorNombre: string;
  autorAvatar: string | null; // URL de la miniatura (96 px) o null si no tiene foto
  audioUrl: string | null; // audio original, si el comentario es de voz
  estado: EstadoComentario;
  errorMsg: string | null;
  createdAt: string;
}

/** Lista los comentarios de un manual con el nombre y foto de su autor. */
export async function listarComentarios(manualId: string): Promise<Comentario[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('comentarios')
    .select('id, manual_id, pagina, x, y, texto, autor_id, audio_path, estado, error_msg, created_at')
    .eq('manual_id', manualId)
    .order('created_at', { ascending: true });
  if (error) throw new Error('No se pudieron cargar los comentarios.');
  const filas = data ?? [];

  const ids = [...new Set(filas.map((f) => f.autor_id as string))];
  const nombres = new Map<string, string>();
  const avatares = new Map<string, string | null>();
  if (ids.length > 0) {
    const { data: perfiles } = await supabase
      .from('perfiles')
      .select('id, nombre, avatar_path, avatar_version')
      .in('id', ids);
    for (const p of perfiles ?? []) {
      const perfil = {
        id: p.id as string,
        nombre: (p.nombre as string) || 'Anónimo',
        avatarPath: (p.avatar_path as string | null) ?? null,
        avatarVersion: (p.avatar_version as number) ?? 0,
      };
      nombres.set(perfil.id, perfil.nombre);
      avatares.set(perfil.id, urlAvatar(perfil, 'mini'));
    }
  }

  return filas.map((f) => {
    const audioPath = (f.audio_path as string | null) ?? null;
    return {
      id: f.id as string,
      manualId: f.manual_id as string,
      pagina: f.pagina as number,
      x: Number(f.x),
      y: Number(f.y),
      texto: f.texto as string,
      autorId: f.autor_id as string,
      autorNombre: nombres.get(f.autor_id as string) ?? 'Anónimo',
      autorAvatar: avatares.get(f.autor_id as string) ?? null,
      audioUrl: audioPath ? supabase!.storage.from(BUCKET_AUDIO).getPublicUrl(audioPath).data.publicUrl : null,
      estado: (f.estado as EstadoComentario) ?? 'listo',
      errorMsg: (f.error_msg as string | null) ?? null,
      createdAt: f.created_at as string,
    };
  });
}

/** Crea un comentario de texto. Usa la sesión actual o una anónima nueva. */
export async function crearComentario(input: { manualId: string; pagina: number; x: number; y: number; texto: string }): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const texto = input.texto.trim();
  if (texto.length < 1 || texto.length > TEXTO_MAX) {
    throw new Error(`El comentario debe tener entre 1 y ${TEXTO_MAX} caracteres.`);
  }
  await ensureSession();
  const { data, error } = await supabase
    .from('comentarios')
    .insert({
      manual_id: input.manualId,
      pagina: input.pagina,
      x: input.x,
      y: input.y,
      texto,
      estado: 'listo',
    })
    .select('id');
  if (error) throw new Error('No se pudo guardar el comentario. Inténtalo de nuevo.');
  if (!data || data.length === 0) throw new Error('No se pudo guardar el comentario.');
}

/**
 * Crea un comentario de voz: sube el audio y guarda la fila en estado `pendiente`.
 * El cliente no tiene política UPDATE, así que el id y la ruta del audio van en el mismo INSERT.
 * Después hay que llamar a `transcribirComentario`.
 */
export async function crearComentarioVoz(input: { manualId: string; pagina: number; x: number; y: number; audio: Blob }): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const session = await ensureSession();
  const uid = session?.user.id;
  if (!uid) throw new Error('No se pudo iniciar la sesión.');

  const id = crypto.randomUUID();
  const tipo = input.audio.type.split(';')[0] || 'audio/webm'; // el bucket acepta el tipo sin parámetros (codecs)
  const ext = tipo.includes('mp4') ? 'mp4' : 'webm';
  const path = `${uid}/${id}.${ext}`;

  const { error: errSubida } = await supabase.storage.from(BUCKET_AUDIO).upload(path, input.audio, { contentType: tipo, upsert: false });
  if (errSubida) throw new Error('No se pudo subir el audio. Revisa la conexión.');

  const { error } = await supabase.from('comentarios').insert({
    id,
    manual_id: input.manualId,
    pagina: input.pagina,
    x: input.x,
    y: input.y,
    texto: '',
    audio_path: path,
    estado: 'pendiente',
  });
  if (error) {
    await supabase.storage.from(BUCKET_AUDIO).remove([path]); // no dejar audios huérfanos
    throw new Error('No se pudo guardar el comentario de voz.');
  }
  return id;
}

/** Pide al servidor que transcriba el audio. Devuelve el estado final. */
export async function transcribirComentario(id: string): Promise<{ estado: EstadoComentario; texto?: string }> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Tu sesión ha caducado. Recarga la página.');
  const ctrl = new AbortController();
  const tiempo = window.setTimeout(() => ctrl.abort(), 50_000);
  let res: Response;
  try {
    res = await fetch('/api/transcribir', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ comentario_id: id }),
      signal: ctrl.signal,
    });
  } catch (e) {
    const abortado = e instanceof Error && e.name === 'AbortError';
    throw new Error(abortado ? 'La transcripción tardó demasiado. Reintenta.' : 'No hay conexión con el servidor de transcripción.');
  } finally {
    window.clearTimeout(tiempo);
  }

  // Si la respuesta no es JSON, no llegamos a la función (p. ej. Vite sin `vercel dev`, o 404 de hosting)
  const tipo = res.headers.get('content-type') ?? '';
  if (!tipo.includes('application/json')) {
    throw new Error(
      res.status === 404
        ? 'El servidor de transcripción no está disponible (/api/transcribir no existe en este entorno).'
        : `El servidor de transcripción respondió con un error inesperado (${res.status}).`,
    );
  }
  const json = (await res.json()) as { estado?: EstadoComentario; texto?: string; error?: string; detalle?: string; codigo?: string };
  if (!res.ok) {
    const extra = json.detalle ? ` (${json.detalle})` : '';
    throw new Error(`${json.error ?? 'No se pudo transcribir el audio.'}${extra}`);
  }
  return { estado: json.estado ?? 'listo', texto: json.texto };
}

/** Borra un comentario propio. La política RLS impide borrar los ajenos. */
export async function borrarComentario(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.from('comentarios').delete().eq('id', id).select('id');
  if (error) throw new Error('No se pudo borrar el comentario.');
  if (!data || data.length === 0) throw new Error('No tienes permiso para borrar este comentario.');
}

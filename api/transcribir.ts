import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// T2 — Transcribe el audio de un comentario y guarda el texto.
// POST /api/transcribir  { comentario_id }  con cabecera Authorization: Bearer <token del usuario>.
// Solo el autor del comentario puede pedir la transcripción.
// Principal: Groq (whisper-large-v3-turbo). Respaldo: Hugging Face (whisper-large-v3).
// Variables de servidor (Vercel): VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY,
// SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY, HF_TOKEN.
// Regla: toda ruta que haya tocado una fila la deja en `listo` o `error`. Nunca se queda en `transcribiendo`.

// Tipos mínimos para no depender de @vercel/node
interface Req {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

// Tiempo máximo que Vercel da a la función (segundos)
export const config = { maxDuration: 60 };

const BUCKET = 'comentarios';
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_TEXTO = 500;
// Groq y HF juntos no pueden pasar de ~45 s para que la función (60 s) termine siempre y marque el error
const TIMEOUT_PROVEEDOR_MS = 20_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Error con mensaje seguro para mostrar al usuario (sin claves ni trazas). */
class ErrorTranscripcion extends Error {
  constructor(public codigo: string, mensaje: string) {
    super(mensaje);
  }
}

async function fetchConTiempo(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_PROVEEDOR_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    const abortado = e instanceof Error && e.name === 'AbortError';
    throw new ErrorTranscripcion(abortado ? 'timeout' : 'red', abortado ? 'El servicio de voz tardó demasiado.' : 'No hay conexión con el servicio de voz.');
  } finally {
    clearTimeout(t);
  }
}

async function conGroq(audio: File): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new ErrorTranscripcion('config', 'Falta la clave GROQ_API_KEY en el servidor.');
  const fd = new FormData();
  fd.append('file', audio, audio.name);
  fd.append('model', 'whisper-large-v3-turbo');
  fd.append('language', 'es');
  fd.append('response_format', 'json');
  const r = await fetchConTiempo('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
  });
  if (!r.ok) throw new ErrorTranscripcion('groq', `Groq respondió ${r.status}.`);
  const j = (await r.json()) as { text?: string };
  return (j.text ?? '').trim();
}

async function conHuggingFace(audio: File): Promise<string> {
  const key = process.env.HF_TOKEN;
  if (!key) throw new ErrorTranscripcion('config', 'Falta la clave HF_TOKEN en el servidor.');
  const r = await fetchConTiempo('https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': audio.type || 'audio/webm' },
    body: audio,
  });
  if (!r.ok) throw new ErrorTranscripcion('hf', `Hugging Face respondió ${r.status}.`);
  const j = (await r.json()) as { text?: string };
  return (j.text ?? '').trim();
}

async function transcribir(audio: File): Promise<string> {
  try {
    return await conGroq(audio);
  } catch (e) {
    // Respaldo: si Groq falla (cuota, red, clave), probamos Hugging Face
    try {
      return await conHuggingFace(audio);
    } catch (e2) {
      const a = e instanceof Error ? e.message : 'Groq falló';
      const b = e2 instanceof Error ? e2.message : 'Hugging Face falló';
      throw new ErrorTranscripcion('proveedores', `${a} ${b}`);
    }
  }
}

async function marcarError(admin: SupabaseClient, id: string, codigo: string, mensaje: string) {
  await admin
    .from('comentarios')
    .update({ estado: 'error', error_msg: `${codigo}: ${mensaje}`.slice(0, 200) })
    .eq('id', id);
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.', codigo: 'metodo' });

  // Cualquier fallo inesperado se responde en JSON, nunca como página HTML
  try {
    const auth = req.headers.authorization;
    const token = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : null;
    let body: { comentario_id?: unknown } | undefined;
    try {
      body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as { comentario_id?: unknown } | undefined;
    } catch {
      body = undefined;
    }
    const id = body?.comentario_id;
    if (!token || typeof id !== 'string' || !UUID.test(id)) {
      return res.status(400).json({ error: 'Petición no válida.', codigo: 'peticion' });
    }

    const url = process.env.VITE_SUPABASE_URL;
    const publicKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !publicKey || !serviceKey) {
      return res.status(500).json({ error: 'El servidor no está configurado (faltan variables de Supabase).', codigo: 'config' });
    }

    // 1. Quién pide: el token del usuario debe ser válido
    const userClient = createClient(url, publicKey, { auth: { persistSession: false } });
    const { data: userData, error: errUsuario } = await userClient.auth.getUser(token);
    if (errUsuario || !userData.user) {
      return res.status(401).json({ error: 'Tu sesión no es válida. Recarga la página.', codigo: 'sesion' });
    }

    // 2. El comentario debe existir y ser del usuario (la clave de servicio ignora RLS, así que se comprueba aquí)
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: fila, error: errFila } = await admin
      .from('comentarios')
      .select('id, autor_id, audio_path, estado')
      .eq('id', id)
      .maybeSingle();
    if (errFila) return res.status(500).json({ error: 'No se pudo leer el comentario.', codigo: 'bd' });
    if (!fila || fila.autor_id !== userData.user.id) {
      return res.status(404).json({ error: 'Comentario no encontrado.', codigo: 'no_encontrado' });
    }
    if (!fila.audio_path) return res.status(400).json({ error: 'El comentario no tiene audio.', codigo: 'sin_audio' });
    if (fila.estado === 'listo') return res.status(200).json({ estado: 'listo' });

    // 3. A partir de aquí la fila pasa a "transcribiendo" y siempre acaba en listo o error
    await admin.from('comentarios').update({ estado: 'transcribiendo', error_msg: null }).eq('id', id);

    try {
      const { data: blob, error } = await admin.storage.from(BUCKET).download(fila.audio_path as string);
      if (error || !blob) throw new ErrorTranscripcion('audio', 'No se encontró el audio en el almacenamiento.');
      if (blob.size === 0) throw new ErrorTranscripcion('audio', 'El audio está vacío.');
      if (blob.size > MAX_BYTES) throw new ErrorTranscripcion('audio', 'El audio es demasiado grande.');

      const ext = (fila.audio_path as string).endsWith('.mp4') ? 'mp4' : 'webm';
      const audio = new File([blob], `audio.${ext}`, { type: blob.type || `audio/${ext}` });
      const texto = (await transcribir(audio)).slice(0, MAX_TEXTO);

      await admin.from('comentarios').update({ estado: 'listo', texto, error_msg: null }).eq('id', id);
      return res.status(200).json({ estado: 'listo', texto });
    } catch (e) {
      const codigo = e instanceof ErrorTranscripcion ? e.codigo : 'interno';
      const mensaje = e instanceof Error ? e.message : 'Error desconocido.';
      console.error('[transcribir]', codigo, mensaje);
      await marcarError(admin, id, codigo, mensaje);
      return res.status(502).json({ estado: 'error', error: 'No se pudo transcribir el audio.', codigo, detalle: mensaje });
    }
  } catch (e) {
    console.error('[transcribir] inesperado', e);
    return res.status(500).json({ error: 'Error inesperado en el servidor.', codigo: 'interno' });
  }
}

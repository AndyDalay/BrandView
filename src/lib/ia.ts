import { supabase } from '@/lib/supabaseClient';

// C2 — Cliente de la redacción con IA (api/redactar.ts).
export async function leerComoDataUrl(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    lector.readAsDataURL(archivo);
  });
}

export async function redactarComentario(prompt: string, adjunto?: File): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Inicia sesión para usar la IA.');

  const cuerpo: { prompt: string; adjunto?: { tipo: string; datos: string } } = { prompt };
  if (adjunto) cuerpo.adjunto = { tipo: adjunto.type, datos: await leerComoDataUrl(adjunto) };

  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 28_000);
  let res: Response;
  try {
    res = await fetch('/api/redactar', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(cuerpo),
      signal: ctrl.signal,
    });
  } catch (e) {
    const abortado = e instanceof Error && e.name === 'AbortError';
    throw new Error(abortado ? 'La IA tardó demasiado. Inténtalo de nuevo.' : 'No hay conexión con la IA.');
  } finally {
    window.clearTimeout(timer);
  }
  const tipo = res.headers.get('content-type') ?? '';
  if (!tipo.includes('application/json')) throw new Error('La IA no está disponible en este entorno (usa vercel dev).');
  const json = (await res.json()) as { texto?: string; error?: string };
  if (!res.ok || !json.texto) throw new Error(json.error ?? 'No se pudo redactar el comentario.');
  return json.texto;
}

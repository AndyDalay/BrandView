import { supabase } from './supabase';
import type { Manual } from './gallery';

const BUCKET = 'manuales';

function extFor(type: string): string {
  if (type.includes('svg')) return 'svg';
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('gif')) return 'gif';
  return 'jpg';
}

// Manuales compartidos (públicos) guardados en Supabase
export async function loadRemote(): Promise<Manual[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('manuales')
    .select('*')
    .eq('oculto', false)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  const pub = (path: string) => supabase!.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return data.map((r) => ({
    id: r.id as string,
    nombre: r.nombre as string,
    portada: pub(r.portada as string),
    portadaW: r.portada_w as number,
    portadaH: r.portada_h as number,
    paginaW: r.pagina_w as number,
    paginaH: r.pagina_h as number,
    paginas: (r.paginas as string[]).map(pub),
    local: false,
  }));
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function sendLoginLink(email: string) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href },
  });
  if (error) throw new Error(error.message);
}

// Sube las páginas al bucket y crea/actualiza la fila. Devuelve el enlace público.
export async function publishManual(m: Manual, onProgress?: (p: number) => void): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const session = await getSession();
  if (!session) throw new Error('Inicia sesión para compartir.');

  const paths: string[] = [];
  for (let i = 0; i < m.paginas.length; i++) {
    const res = await fetch(m.paginas[i]);
    if (!res.ok) throw new Error(`No se pudo leer la página ${i + 1}.`);
    const blob = await res.blob();
    const path = `${m.id}/${String(i).padStart(2, '0')}.${extFor(blob.type)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: blob.type || undefined,
    });
    if (error) throw new Error(error.message);
    paths.push(path);
    onProgress?.((i + 1) / m.paginas.length);
  }

  const { error } = await supabase.from('manuales').upsert(
    {
      id: m.id,
      nombre: m.nombre,
      portada: paths[0],
      paginas: paths,
      portada_w: m.portadaW,
      portada_h: m.portadaH,
      pagina_w: m.paginaW,
      pagina_h: m.paginaH,
      oculto: false,
      owner_id: session.user.id,
    },
    { onConflict: 'id' }
  );
  if (error) throw new Error(error.message);
  return `${window.location.origin}/manual/${encodeURIComponent(m.id)}`;
}
export const supabaseReady = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);
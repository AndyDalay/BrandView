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
    remoto: true,
  }));
}

// Borra un manual compartido: primero los archivos del Storage, luego la fila.
// Solo el dueño puede hacerlo (RLS: 0002 y 0005). Si el Storage falla, la fila no se borra.
export async function deleteSharedManual(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data: row, error: readError } = await supabase
    .from('manuales')
    .select('portada, paginas')
    .eq('id', id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!row) return; // ya no existe

  const paths = [row.portada as string, ...((row.paginas as string[]) ?? [])].filter(Boolean);
  const unique = [...new Set(paths)];
  if (unique.length > 0) {
    // Sin la política de borrado (0005) Storage responde sin error y no borra nada:
    // por eso se cuentan los archivos realmente eliminados.
    const { data: removed, error: storageError } = await supabase.storage.from(BUCKET).remove(unique);
    if (storageError || (removed?.length ?? 0) < unique.length) {
      const motivo = storageError ? ` Motivo: ${storageError.message}.` : '';
      throw new Error(
        `No se pudieron borrar los archivos (${removed?.length ?? 0} de ${unique.length}).${motivo} El manual no se ha borrado.`,
      );
    }
  }

  const { data: deleted, error } = await supabase.from('manuales').delete().eq('id', id).select('id');
  if (error) throw new Error(error.message);
  if (!deleted || deleted.length === 0) throw new Error('No tienes permiso para borrar este manual.');
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Sesión anónima automática: no pide correo. Supabase la crea la primera vez.
export async function ensureSession() {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const existing = await getSession();
  if (existing) return existing;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(error.message);
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
  const session = await ensureSession();
  if (!session) throw new Error('No se pudo iniciar la sesión para compartir.');

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
// Misma comprobación que el cliente (VITE_SUPABASE_PUBLISHABLE_KEY)
export { supabaseReady } from './supabase';
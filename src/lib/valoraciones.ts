import { supabase } from '@/lib/supabaseClient';
import { ensureSession } from '@/lib/share';

// S2 — Me gusta / no me gusta en manuales compartidos. Tabla `valoraciones` (migración 0006).
export type Voto = 'like' | 'dislike';

export interface Valoraciones {
  likes: number;
  dislikes: number;
  miVoto: Voto | null;
}

export async function listarValoraciones(manualId: string, uid: string | null): Promise<Valoraciones> {
  if (!supabase) return { likes: 0, dislikes: 0, miVoto: null };
  const { data, error } = await supabase.from('valoraciones').select('tipo, user_id').eq('manual_id', manualId);
  if (error) throw new Error('No se pudieron cargar las valoraciones.');
  const filas = data ?? [];
  return {
    likes: filas.filter((f) => f.tipo === 'like').length,
    dislikes: filas.filter((f) => f.tipo === 'dislike').length,
    miVoto: (uid ? (filas.find((f) => f.user_id === uid)?.tipo as Voto | undefined) : undefined) ?? null,
  };
}

/** Registra el voto. Si ya había votado, Supabase rechaza el segundo (clave primaria). */
export async function votar(manualId: string, tipo: Voto): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  await ensureSession();
  const { error } = await supabase.from('valoraciones').insert({ manual_id: manualId, tipo });
  if (error) {
    if (error.code === '23505') throw new Error('Ya has valorado este manual.');
    throw new Error('No se pudo guardar tu valoración. Inténtalo de nuevo.');
  }
}

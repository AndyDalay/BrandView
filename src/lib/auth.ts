import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

// Login con Google (P2). La sesión anónima de "Compartir" se vincula con linkIdentity
// para conservar el mismo user.id. Ver STATE.md, sección "Cuentas y perfiles".
// /cuenta todavía no existe (P8): hasta entonces el redirect puede caer en la ruta "*".
const CUENTA_PATH = '/cuenta';

/** Usuario de la sesión actual (anónimo o con Google), o null. */
export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

/** Cuenta con identidad de Google (no anónima). */
export function isGoogleAccount(user: User | null): boolean {
  return Boolean(user) && !user!.is_anonymous;
}

/**
 * Inicia sesión con Google.
 * - Sesión anónima activa → linkIdentity (mismo user.id).
 * - Sin sesión (o sesión ya con identidad) → signInWithOAuth.
 * Lanza un Error con mensaje en español si falla.
 */
export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const redirectTo = `${window.location.origin}${CUENTA_PATH}`;
  const { data } = await supabase.auth.getSession();

  if (data.session?.user.is_anonymous) {
    const { error } = await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo } });
    if (error) throw new Error(traducirErrorAuth(error));
    return;
  }

  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  if (error) throw new Error(traducirErrorAuth(error));
}

/** Cierra la sesión actual. */
export async function signOut(): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error('No se pudo cerrar la sesión. Inténtalo de nuevo.');
}

/** Suscripción al estado de sesión. Devuelve la función para cancelarla. */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange(
    (_event: AuthChangeEvent, session: Session | null) => callback(session?.user ?? null),
  );
  return () => data.subscription.unsubscribe();
}

/** Traduce errores de Supabase Auth a un mensaje claro en español. */
export function traducirErrorAuth(error: { code?: string; message: string }): string {
  if (error.code === 'identity_already_exists' || /identity.*already exists/i.test(error.message)) {
    return 'Esa cuenta de Google ya está vinculada a otro usuario. Usa otra cuenta de Google.';
  }
  return 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.';
}

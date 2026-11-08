// Punto de entrada único para Supabase en el código de la skill (@/lib/supabaseClient).
// El cliente real vive en src/lib/supabase.ts: no crear otro cliente aquí.
export { supabase, supabaseReady } from './supabase';

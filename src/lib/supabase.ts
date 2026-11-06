import { createClient } from '@supabase/supabase-js';

// Solo claves públicas en el frontend (la publishable key está pensada para esto).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseReady = Boolean(url && key);
export const supabase = supabaseReady ? createClient(url as string, key as string) : null;

// Diagnóstico: solo indica si cada variable llega, nunca muestra su valor
export const supabaseEnvStatus = {
  url: Boolean(url),
  key: Boolean(key),
  mode: import.meta.env.MODE,
};

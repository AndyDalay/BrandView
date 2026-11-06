import { createClient } from '@supabase/supabase-js';

// Solo claves públicas en el frontend (la publishable key está pensada para esto).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseReady = Boolean(url && key);
export const supabase = supabaseReady ? createClient(url as string, key as string) : null;

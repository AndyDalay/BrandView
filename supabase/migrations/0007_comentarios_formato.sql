-- 0007: formato del texto de los comentarios (C3). Ejecutar en Supabase > SQL Editor, después de 0003.
-- `texto` sigue guardando el texto plano (búsqueda, lectura en voz alta). `texto_html` guarda el formato
-- ya limpiado por el cliente: solo b, i, u, br y a con enlaces http(s).
alter table public.comentarios add column if not exists texto_html text;
alter table public.comentarios drop constraint if exists comentarios_texto_html_len;
alter table public.comentarios add constraint comentarios_texto_html_len check (char_length(texto_html) <= 4000);

-- 0003: comentarios con audio y transcripción (T1)
-- Ejecutar en Supabase > SQL Editor, después de 0001, 0002, 0004 y 0005.
-- Decisión: sin clave foránea a manuales. Los manuales de /public no están en la tabla;
-- la app solo permite comentar en manuales compartidos (incluido el propio autor).

create table if not exists public.comentarios (
  id          uuid primary key default gen_random_uuid(),
  manual_id   text not null,
  pagina      integer not null check (pagina >= 0),
  x           numeric not null check (x between 0 and 1),  -- posición normalizada
  y           numeric not null check (y between 0 and 1),
  autor_id    uuid not null default auth.uid(),
  texto       text not null default '' check (char_length(texto) <= 500),
  audio_path  text,                                         -- ruta en el bucket "comentarios"
  estado      text not null default 'listo'
              check (estado in ('pendiente', 'transcribiendo', 'listo', 'error')),
  error_msg   text,
  created_at  timestamptz not null default now()
);

alter table public.comentarios enable row level security;

-- Lectura pública: los comentarios son visibles en el manual
drop policy if exists "comentarios: lectura pública" on public.comentarios;
create policy "comentarios: lectura pública"
  on public.comentarios for select to anon, authenticated
  using (true);

-- Insertar solo con sesión y como autor propio
drop policy if exists "comentarios: insertar propio" on public.comentarios;
create policy "comentarios: insertar propio"
  on public.comentarios for insert to authenticated
  with check (autor_id = auth.uid());

-- Borrar solo el autor. Sin política de update: el estado lo cambia la función del servidor (clave de servicio).
drop policy if exists "comentarios: borrar propio" on public.comentarios;
create policy "comentarios: borrar propio"
  on public.comentarios for delete to authenticated
  using (autor_id = auth.uid());

-- Bucket de audio: público en lectura, máx. 2 MB, solo webm y mp4
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comentarios', 'comentarios', true, 2097152, array['audio/webm', 'audio/mp4'])
on conflict (id) do nothing;

drop policy if exists "comentarios storage: subir" on storage.objects;
create policy "comentarios storage: subir"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'comentarios');

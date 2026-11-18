-- C1: adjuntos en comentarios (imagen o PDF). Bucket propio, separado del audio.
-- Lectura pública (como el audio); subida solo a la carpeta del propio usuario.

alter table public.comentarios
  add column if not exists adjunto_path text,
  add column if not exists adjunto_nombre text check (char_length(adjunto_nombre) <= 120),
  add column if not exists adjunto_tipo text check (
    adjunto_tipo in ('image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf')
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comentarios-adjuntos',
  'comentarios-adjuntos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do nothing;

drop policy if exists "comentarios adjuntos: subir" on storage.objects;
create policy "comentarios adjuntos: subir"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'comentarios-adjuntos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Borrado de adjuntos propios (rollback al fallar el insert y limpieza al borrar el comentario).
drop policy if exists "comentarios adjuntos: borrar propio" on storage.objects;
create policy "comentarios adjuntos: borrar propio"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'comentarios-adjuntos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Audio de comentarios: mismo permiso de borrado para la carpeta propia
drop policy if exists "comentarios audio: borrar propio" on storage.objects;
create policy "comentarios audio: borrar propio"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'comentarios'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

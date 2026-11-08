-- 0005: borrado real de manuales compartidos (S2).
-- Ejecutar en Supabase > SQL Editor, después de 0001 y 0002.
-- La política de borrar la fila ya existe en 0002 ("manuales: borrar propio").
-- Esta añade el borrado de los archivos del bucket "manuales" solo para el dueño de la fila.
-- Los archivos se guardan en la carpeta `<id del manual>/...`.

drop policy if exists "manuales storage: borrar propio" on storage.objects;
create policy "manuales storage: borrar propio"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'manuales'
    and exists (
      select 1 from public.manuales m
      where m.id = (storage.foldername(name))[1]
        and m.owner_id = auth.uid()
    )
  );

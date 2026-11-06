-- 0002: compartir manuales.
-- Ejecutar en Supabase > SQL Editor (después de 0001, o sola si la tabla no existe).

-- Columnas que necesita la app
alter table public.manuales add column if not exists pagina_w integer not null default 1600;
alter table public.manuales add column if not exists pagina_h integer not null default 1066;
alter table public.manuales add column if not exists owner_id uuid default auth.uid();

-- Escritura: solo usuarios con sesión, y solo sobre sus propias filas
drop policy if exists "manuales: insertar propio" on public.manuales;
create policy "manuales: insertar propio"
  on public.manuales for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "manuales: actualizar propio" on public.manuales;
create policy "manuales: actualizar propio"
  on public.manuales for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "manuales: borrar propio" on public.manuales;
create policy "manuales: borrar propio"
  on public.manuales for delete to authenticated
  using (owner_id = auth.uid());

-- Storage: subir/actualizar imágenes solo con sesión (la lectura es pública por el bucket)
drop policy if exists "manuales storage: subir" on storage.objects;
create policy "manuales storage: subir"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'manuales');

drop policy if exists "manuales storage: actualizar" on storage.objects;
create policy "manuales storage: actualizar"
  on storage.objects for update to authenticated
  using (bucket_id = 'manuales');

-- Auth (en el panel, no en SQL):
--   Authentication > URL Configuration:
--     Site URL       = https://TU-DOMINIO.vercel.app
--     Redirect URLs  = https://TU-DOMINIO.vercel.app/**  (y http://localhost:5173/** para desarrollo)

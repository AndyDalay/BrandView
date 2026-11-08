-- 0004: perfiles y avatares (P3)
-- Ejecutar en Supabase > SQL Editor, después de 0001–0005.

-- Un perfil por usuario de auth. Nombre y foto son públicos; el email no se expone.
create table if not exists public.perfiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  nombre          text not null default '',
  avatar_path     text,                       -- p. ej. "uid/256.webp"
  avatar_version  integer not null default 0, -- sube con cada cambio de foto (evita caché vieja)
  updated_at      timestamptz not null default now(),
  constraint perfiles_nombre_len check (char_length(nombre) <= 40)
);

alter table public.perfiles enable row level security;

-- Lectura pública (nombre y foto visibles en comentarios)
drop policy if exists "perfiles: lectura pública" on public.perfiles;
create policy "perfiles: lectura pública"
  on public.perfiles for select to anon, authenticated
  using (true);

-- Solo el propio usuario puede editar su perfil. No hay insert: lo crea el trigger.
drop policy if exists "perfiles: editar propio" on public.perfiles;
create policy "perfiles: editar propio"
  on public.perfiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Trigger: crea la fila al crearse un usuario (también anónimos)
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_creado on auth.users;
create trigger on_auth_user_creado
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- Usuarios que ya existían (anónimos de "Compartir") no tienen fila: se crean ahora
insert into public.perfiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Bucket de avatares (público en lectura; la escritura es solo del propio usuario)
insert into storage.buckets (id, name, public)
values ('avatares', 'avatares', true)
on conflict (id) do nothing;

-- Solo se escribe en la carpeta <auth.uid()>/…
drop policy if exists "avatares: subir propio" on storage.objects;
create policy "avatares: subir propio"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatares: actualizar propio" on storage.objects;
create policy "avatares: actualizar propio"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatares: borrar propio" on storage.objects;
create policy "avatares: borrar propio"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

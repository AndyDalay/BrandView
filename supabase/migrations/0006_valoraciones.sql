-- 0006: me gusta / no me gusta en manuales compartidos (S2).
-- Ejecutar en Supabase > SQL Editor, después de 0001–0005.
-- Un voto por usuario y manual. Sin update ni delete desde el cliente: cambiar el voto no está en esta versión.

create table if not exists public.valoraciones (
  manual_id   text not null,
  user_id     uuid not null default auth.uid(),
  tipo        text not null check (tipo in ('like', 'dislike')),
  created_at  timestamptz not null default now(),
  primary key (manual_id, user_id)
);

alter table public.valoraciones enable row level security;

drop policy if exists "valoraciones: lectura pública" on public.valoraciones;
create policy "valoraciones: lectura pública"
  on public.valoraciones for select to anon, authenticated
  using (true);

drop policy if exists "valoraciones: votar propio" on public.valoraciones;
create policy "valoraciones: votar propio"
  on public.valoraciones for insert to authenticated
  with check (user_id = auth.uid());

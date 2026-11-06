-- Migración inicial (opcional por ahora: la app guarda hoy los manuales en IndexedDB).
-- Ejecutar en Supabase > SQL Editor, o con la CLI: supabase db push

create table if not exists public.manuales (
  id          text primary key,              -- slug, ej. "ejemplo-marca"
  nombre      text not null,
  portada     text not null,                 -- ruta en Storage
  paginas     text[] not null default '{}',  -- rutas en Storage, en orden
  portada_w   integer not null,
  portada_h   integer not null,
  orden       integer not null default 0,
  oculto      boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.manuales enable row level security;

-- Lectura pública (la galería es pública)
create policy "manuales: lectura pública"
  on public.manuales for select
  to anon, authenticated
  using (oculto = false);

-- Sin políticas de escritura: insertar/editar/borrar solo con la clave secreta (servidor) o con un rol admin.

-- Bucket de imágenes de manuales (público en lectura)
insert into storage.buckets (id, name, public)
values ('manuales', 'manuales', true)
on conflict (id) do nothing;

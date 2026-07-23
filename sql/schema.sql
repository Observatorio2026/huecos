-- =====================================================================
-- ESQUEMA DE BASE DE DATOS: Geovisor de Reporte de Huecos
-- Municipio de La Ceja del Tambo, Antioquia
-- Motor: PostgreSQL + PostGIS (Supabase)
-- =====================================================================
-- Ejecutar este script completo en: Supabase Dashboard > SQL Editor
-- =====================================================================

-- 1. Extensión espacial (Supabase generalmente ya la trae activa)
create extension if not exists postgis;
create extension if not exists pgcrypto; -- para gen_random_uuid()

-- =====================================================================
-- 2. TABLA PRINCIPAL: huecos
-- =====================================================================
create table if not exists public.huecos (
    id                uuid primary key default gen_random_uuid(),
    geom              geometry(Point, 4326) not null,        -- Coordenadas WGS84 (lat/lng)
    direccion         text,                                   -- Dirección aproximada (reverse geocoding o manual)
    descripcion       text not null,                          -- Descripción del hueco
    comentario        text,                                   -- Comentario adicional del ciudadano
    foto_url          text,                                   -- URL pública en Supabase Storage
    estado            text not null default 'pendiente'
                        check (estado in ('pendiente', 'en_proceso', 'reparado')),
    notas_admin       text,                                   -- Notas internas del panel administrativo
    reportado_por     text,                                   -- Nombre/contacto opcional del ciudadano
    fecha_reporte     timestamptz not null default now(),
    fecha_actualizacion timestamptz not null default now()
);

-- Índice espacial (fundamental para rendimiento en consultas de mapa)
create index if not exists huecos_geom_idx on public.huecos using gist (geom);
create index if not exists huecos_estado_idx on public.huecos (estado);
create index if not exists huecos_fecha_idx on public.huecos (fecha_reporte desc);

-- Trigger para actualizar fecha_actualizacion automáticamente
create or replace function public.set_fecha_actualizacion()
returns trigger as $$
begin
    new.fecha_actualizacion = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_huecos_update on public.huecos;
create trigger trg_huecos_update
    before update on public.huecos
    for each row
    execute function public.set_fecha_actualizacion();

-- =====================================================================
-- 3. SEGURIDAD: Row Level Security (RLS)
-- =====================================================================
-- Regla de negocio:
--   - Cualquier persona (rol "anon") puede REPORTAR (insertar) y VER los huecos.
--   - Solo usuarios autenticados (administradores creados en Supabase Auth)
--     pueden ACTUALIZAR (cambiar estado, notas) o ELIMINAR reportes.

alter table public.huecos enable row level security;

-- Lectura pública (para que el geovisor cargue los puntos sin login)
drop policy if exists "huecos_select_publico" on public.huecos;
create policy "huecos_select_publico"
    on public.huecos for select
    to anon, authenticated
    using (true);

-- Inserción pública (para que cualquier ciudadano reporte)
drop policy if exists "huecos_insert_publico" on public.huecos;
create policy "huecos_insert_publico"
    on public.huecos for insert
    to anon, authenticated
    with check (true);

-- Actualización solo para administradores autenticados
drop policy if exists "huecos_update_admin" on public.huecos;
create policy "huecos_update_admin"
    on public.huecos for update
    to authenticated
    using (true)
    with check (true);

-- Eliminación solo para administradores autenticados
drop policy if exists "huecos_delete_admin" on public.huecos;
create policy "huecos_delete_admin"
    on public.huecos for delete
    to authenticated
    using (true);

-- =====================================================================
-- 4. VISTA GEOJSON (opcional, útil para depuración o integraciones GIS)
-- =====================================================================
create or replace view public.huecos_geojson as
select
    id,
    estado,
    direccion,
    descripcion,
    foto_url,
    fecha_reporte,
    st_asgeojson(geom)::json as geometry
from public.huecos;

-- =====================================================================
-- 4.1 FUNCIÓN RPC: huecos_con_coordenadas
-- =====================================================================
-- El cliente JS de Supabase no interpreta geometrías PostGIS directamente,
-- así que esta función expone lat/lng ya extraídos con ST_Y / ST_X.
create or replace function public.huecos_con_coordenadas()
returns table (
    id uuid,
    estado text,
    direccion text,
    descripcion text,
    comentario text,
    foto_url text,
    notas_admin text,
    fecha_reporte timestamptz,
    fecha_actualizacion timestamptz,
    lat double precision,
    lng double precision
)
language sql
stable
as $$
    select
        id, estado, direccion, descripcion, comentario, foto_url, notas_admin,
        fecha_reporte, fecha_actualizacion,
        st_y(geom) as lat,
        st_x(geom) as lng
    from public.huecos
    order by fecha_reporte desc;
$$;

grant execute on function public.huecos_con_coordenadas() to anon, authenticated;

-- =====================================================================
-- 5. ALMACENAMIENTO (Storage) — crear bucket para fotos
-- =====================================================================
-- Esto también se puede hacer desde el Dashboard > Storage > New bucket
-- Nombre sugerido: fotos-huecos  (marcarlo como PUBLIC)

insert into storage.buckets (id, name, public)
values ('fotos-huecos', 'fotos-huecos', true)
on conflict (id) do nothing;

-- Políticas de Storage: permitir subida pública y lectura pública
drop policy if exists "fotos_huecos_insert_publico" on storage.objects;
create policy "fotos_huecos_insert_publico"
    on storage.objects for insert
    to anon, authenticated
    with check (bucket_id = 'fotos-huecos');

drop policy if exists "fotos_huecos_select_publico" on storage.objects;
create policy "fotos_huecos_select_publico"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'fotos-huecos');

-- =====================================================================
-- 6. USUARIO ADMINISTRADOR
-- =====================================================================
-- Los usuarios administradores NO se crean por SQL. Se crean desde:
-- Supabase Dashboard > Authentication > Users > Add User
-- (correo + contraseña). Ese mismo correo/contraseña se usa para
-- iniciar sesión en admin.html
-- =====================================================================

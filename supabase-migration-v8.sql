-- ============================================================
-- PanasVE — Migración v8: resumen de refugios con pedidos activos
-- Para la vista de proveedores (agrupado + carga diferida)
-- Corre en Supabase > SQL Editor > Run (seguro)
-- ============================================================
-- Devuelve, por cada refugio con pedidos activos (pendiente/progreso),
-- sus datos básicos + cuántos pedidos de comida e insumos tiene.
-- Es una consulta liviana (no trae los items completos).

create or replace function public.refugios_con_pedidos_activos()
returns table (
  shelter_id uuid,
  name text,
  estado text,
  location text,
  lat double precision,
  lng double precision,
  comida_count bigint,
  insumos_count bigint,
  total_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    s.id as shelter_id,
    s.name,
    s.estado,
    s.location,
    s.lat,
    s.lng,
    count(*) filter (where o.order_type = 'comida')  as comida_count,
    count(*) filter (where o.order_type = 'insumos') as insumos_count,
    count(*) as total_count
  from public.orders o
  join public.shelters s on s.id = o.shelter_id
  where o.status in ('pending', 'progress')
  group by s.id, s.name, s.estado, s.location, s.lat, s.lng
  order by s.estado, s.name;
$$;

grant execute on function public.refugios_con_pedidos_activos() to authenticated;

-- ============================================================
-- LISTO.
-- ============================================================

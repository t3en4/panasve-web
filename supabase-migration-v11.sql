-- ============================================================
-- PanasVE — Migración v11: conteos por estado en el resumen
-- Para que el filtro de status (pendiente/progreso/entregado)
-- funcione en la vista agrupada de proveedores y admin.
-- Corre en Supabase > SQL Editor > Run.
-- ============================================================

create or replace function public.refugios_con_pedidos_activos()
returns table (
  shelter_id uuid,
  name text,
  estado text,
  location text,
  lat double precision,
  lng double precision,
  comida_count bigint,      -- comida activa (pendiente + progreso)
  insumos_count bigint,     -- insumos activos (pendiente + progreso)
  total_count bigint,       -- activos (pendiente + progreso)
  pending_count bigint,
  progress_count bigint,
  done_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    s.id as shelter_id, s.name, s.estado, s.location, s.lat, s.lng,
    count(*) filter (where o.order_type = 'comida'  and o.status in ('pending','progress')) as comida_count,
    count(*) filter (where o.order_type = 'insumos' and o.status in ('pending','progress')) as insumos_count,
    count(*) filter (where o.status in ('pending','progress')) as total_count,
    count(*) filter (where o.status = 'pending')  as pending_count,
    count(*) filter (where o.status = 'progress') as progress_count,
    count(*) filter (where o.status = 'done')     as done_count
  from public.orders o
  join public.shelters s on s.id = o.shelter_id
  where o.status in ('pending', 'progress', 'done')
    and s.deactivated_at is null
  group by s.id, s.name, s.estado, s.location, s.lat, s.lng
  -- Mostrar el refugio si tiene al menos un pedido en alguno de esos estados
  having count(*) filter (where o.status in ('pending','progress','done')) > 0
  order by s.estado, s.name;
$$;

grant execute on function public.refugios_con_pedidos_activos() to authenticated;

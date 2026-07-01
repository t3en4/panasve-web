-- ============================================================
-- PanasVE — Migración v14: nuevo tipo de pedido "voluntarios"
--   - Voluntarios usan la cantidad en `people` (cuántos se necesitan)
--   - Reutilizan el sistema de aportes parciales (order_contributions):
--     varios pueden anotar cuántos voluntarios aportan
--   - Nueva columna `purpose`: para qué se necesitan los voluntarios
-- Corre en Supabase > SQL Editor > Run.
-- ============================================================

-- 1) Nuevo valor en el enum de tipo de pedido (el enum se llama order_kind)
alter type order_kind add value if not exists 'voluntarios';

-- 2) Columna de propósito (para qué se necesitan)
alter table public.orders add column if not exists purpose text;

-- 3) Generalizar el registro de aportes para aceptar comida y voluntarios
--    (_recompute_comida_status ya usa `people`, así que sirve para ambos)
create or replace function public.aportar_comida(p_order_id uuid, p_amount integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_total integer;
  v_name text;
begin
  if p_amount is null or p_amount < 1 then raise exception 'Cantidad inválida'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if v_order.order_type not in ('comida', 'voluntarios') then
    raise exception 'Solo aplica a pedidos de comida o voluntarios';
  end if;
  if v_order.status in ('done', 'cancelled') then raise exception 'Este pedido ya está cerrado'; end if;

  select name into v_name from public.profiles where id = auth.uid();

  insert into public.order_contributions (order_id, provider_id, provider_name, amount)
  values (p_order_id, auth.uid(), v_name, p_amount);

  perform public._recompute_comida_status(p_order_id);

  select coalesce(sum(amount), 0) into v_total
  from public.order_contributions where order_id = p_order_id;

  return jsonb_build_object('total', v_total, 'people', v_order.people, 'complete', v_total >= v_order.people);
end;
$$;

-- 4) Conteo por tipo en el resumen: agregar voluntarios_count
drop function if exists public.refugios_con_pedidos_activos();

create function public.refugios_con_pedidos_activos()
returns table (
  shelter_id uuid,
  name text,
  estado text,
  location text,
  lat double precision,
  lng double precision,
  comida_count bigint,
  insumos_count bigint,
  voluntarios_count bigint,
  total_count bigint,
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
    count(*) filter (where o.order_type = 'comida'      and o.status in ('pending','progress')) as comida_count,
    count(*) filter (where o.order_type = 'insumos'     and o.status in ('pending','progress')) as insumos_count,
    count(*) filter (where o.order_type = 'voluntarios' and o.status in ('pending','progress')) as voluntarios_count,
    count(*) filter (where o.status in ('pending','progress')) as total_count,
    count(*) filter (where o.status = 'pending')  as pending_count,
    count(*) filter (where o.status = 'progress') as progress_count,
    count(*) filter (where o.status = 'done')     as done_count
  from public.orders o
  join public.shelters s on s.id = o.shelter_id
  where o.status in ('pending', 'progress', 'done')
    and s.deactivated_at is null
  group by s.id, s.name, s.estado, s.location, s.lat, s.lng
  having count(*) filter (where o.status in ('pending','progress','done')) > 0
  order by s.estado, s.name;
$$;

grant execute on function public.refugios_con_pedidos_activos() to authenticated;

-- ============================================================
-- PanasVE — Migración v9: soft delete de cuentas
-- Corre en Supabase > SQL Editor > Run (seguro)
-- ============================================================
-- Marca de cuenta desactivada (soft delete). NULL = activa.

alter table public.profiles add column if not exists deactivated_at timestamptz;
alter table public.shelters add column if not exists deactivated_at timestamptz;

-- ============================================================
-- Función para que un usuario desactive su propia cuenta
-- (marca profile y su shelter si tiene). No borra datos.
-- ============================================================
create or replace function public.desactivar_mi_cuenta()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set deactivated_at = now() where id = auth.uid();
  update public.shelters set deactivated_at = now() where owner_id = auth.uid();
end;
$$;

grant execute on function public.desactivar_mi_cuenta() to authenticated;

-- ============================================================
-- Cancelar los pedidos ACTIVOS (pendiente/progreso) de un usuario
-- que desactiva su cuenta. Los entregados quedan como historial.
-- ============================================================
create or replace function public.cancelar_pedidos_activos_propios()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders o
  set status = 'cancelled'
  from public.shelters s
  where o.shelter_id = s.id
    and s.owner_id = auth.uid()
    and o.status in ('pending', 'progress');
end;
$$;

grant execute on function public.cancelar_pedidos_activos_propios() to authenticated;

-- ============================================================
-- Recordatorio: el notify-order / digest / broadcast deben
-- excluir cuentas con deactivated_at IS NOT NULL (lo maneja el código).
-- ============================================================

-- ============================================================
-- Actualizar el resumen de refugios para excluir desactivados
-- ============================================================
create or replace function public.refugios_con_pedidos_activos()
returns table (
  shelter_id uuid, name text, estado text, location text,
  lat double precision, lng double precision,
  comida_count bigint, insumos_count bigint, total_count bigint
)
language sql security definer set search_path = public
as $$
  select s.id, s.name, s.estado, s.location, s.lat, s.lng,
    count(*) filter (where o.order_type = 'comida')  as comida_count,
    count(*) filter (where o.order_type = 'insumos') as insumos_count,
    count(*) as total_count
  from public.orders o
  join public.shelters s on s.id = o.shelter_id
  where o.status in ('pending', 'progress')
    and s.deactivated_at is null
  group by s.id, s.name, s.estado, s.location, s.lat, s.lng
  order by s.estado, s.name;
$$;

grant execute on function public.refugios_con_pedidos_activos() to authenticated;

-- ============================================================
-- PanasVE — Migración v12: separar "comprometido" de "entregado"
-- en los aportes de comida. Cada proveedor marca su propio aporte
-- como entregado. La orden pasa a 'done' solo cuando los aportes
-- cubren el total Y todos están entregados.
-- Corre en Supabase > SQL Editor > Run.
-- ============================================================

alter table public.order_contributions
  add column if not exists delivered_at timestamptz;

-- ============================================================
-- Helper: recalcular el estado de un pedido de comida
--   - cubierto (total >= personas) y todos entregados -> 'done'
--   - hay aportes pero falta cubrir o entregar           -> 'progress'
--   - sin aportes                                        -> 'pending'
-- ============================================================
create or replace function public._recompute_comida_status(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_people integer;
  v_total integer;
  v_pendientes integer;
begin
  select people into v_people from public.orders where id = p_order_id;
  select coalesce(sum(amount), 0) into v_total
    from public.order_contributions where order_id = p_order_id;
  select count(*) into v_pendientes
    from public.order_contributions where order_id = p_order_id and delivered_at is null;

  if v_people > 0 and v_total >= v_people and v_pendientes = 0 then
    update public.orders set status = 'done', done_at = now() where id = p_order_id;
  elsif v_total > 0 then
    update public.orders set status = 'progress',
      progress_at = coalesce(progress_at, now()), done_at = null where id = p_order_id;
  else
    update public.orders set status = 'pending',
      progress_at = null, done_at = null where id = p_order_id;
  end if;
end;
$$;

-- ============================================================
-- Registrar un aporte (compromiso). NO marca entregado.
-- ============================================================
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
  if v_order.order_type <> 'comida' then raise exception 'Solo aplica a pedidos de comida'; end if;
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

grant execute on function public.aportar_comida(uuid, integer) to authenticated;

-- ============================================================
-- Marcar MI aporte como entregado
-- ============================================================
create or replace function public.marcar_aporte_entregado(p_contribution_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  select order_id into v_order_id from public.order_contributions
  where id = p_contribution_id and provider_id = auth.uid();
  if not found then raise exception 'Aporte no encontrado'; end if;

  update public.order_contributions set delivered_at = now()
  where id = p_contribution_id and provider_id = auth.uid();

  perform public._recompute_comida_status(v_order_id);
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.marcar_aporte_entregado(uuid) to authenticated;

-- ============================================================
-- Deshacer MI aporte (recalcula estado)
-- ============================================================
create or replace function public.deshacer_aporte(p_contribution_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  select order_id into v_order_id from public.order_contributions
  where id = p_contribution_id and provider_id = auth.uid();
  if not found then raise exception 'Aporte no encontrado'; end if;

  delete from public.order_contributions where id = p_contribution_id and provider_id = auth.uid();
  perform public._recompute_comida_status(v_order_id);
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.deshacer_aporte(uuid) to authenticated;

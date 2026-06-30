-- ============================================================
-- PanasVE — Migración v10: aportes parciales de comida
-- Permite que varios proveedores aporten parte de un pedido de
-- comida (ej. 100 de 300). El pedido se completa al cubrir el total.
-- Corre en Supabase > SQL Editor > Run.
-- ============================================================

create table if not exists public.order_contributions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider_id uuid references public.profiles(id),
  provider_name text,
  amount integer not null check (amount > 0),
  created_at timestamptz default now()
);

create index if not exists idx_contrib_order on public.order_contributions(order_id);

alter table public.order_contributions enable row level security;

-- Lectura: cualquier usuario autenticado puede ver los aportes
drop policy if exists "contrib_select" on public.order_contributions;
create policy "contrib_select" on public.order_contributions
  for select to authenticated using (true);

-- Inserción: solo el propio proveedor (vía RPC abajo, pero por si acaso)
drop policy if exists "contrib_insert_own" on public.order_contributions;
create policy "contrib_insert_own" on public.order_contributions
  for insert to authenticated with check (provider_id = auth.uid());

-- Borrado: el proveedor puede deshacer su propio aporte
drop policy if exists "contrib_delete_own" on public.order_contributions;
create policy "contrib_delete_own" on public.order_contributions
  for delete to authenticated using (provider_id = auth.uid());

-- ============================================================
-- RPC: registrar un aporte de comida (atómico)
-- Inserta el aporte, recalcula el total y actualiza el estado:
--   - si total >= personas  -> 'done'
--   - si hay aportes pero falta -> 'progress'
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
  if p_amount is null or p_amount < 1 then
    raise exception 'Cantidad inválida';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if v_order.order_type <> 'comida' then raise exception 'Solo aplica a pedidos de comida'; end if;
  if v_order.status in ('done', 'cancelled') then raise exception 'Este pedido ya está cerrado'; end if;

  select name into v_name from public.profiles where id = auth.uid();

  insert into public.order_contributions (order_id, provider_id, provider_name, amount)
  values (p_order_id, auth.uid(), v_name, p_amount);

  select coalesce(sum(amount), 0) into v_total
  from public.order_contributions where order_id = p_order_id;

  if v_total >= v_order.people then
    update public.orders set status = 'done', done_at = now() where id = p_order_id;
  else
    update public.orders set status = 'progress',
      progress_at = coalesce(progress_at, now()) where id = p_order_id;
  end if;

  return jsonb_build_object('total', v_total, 'people', v_order.people, 'complete', v_total >= v_order.people);
end;
$$;

grant execute on function public.aportar_comida(uuid, integer) to authenticated;

-- ============================================================
-- RPC: deshacer mi aporte (recalcula estado)
-- ============================================================
create or replace function public.deshacer_aporte(p_contribution_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_people integer;
  v_total integer;
begin
  select order_id into v_order_id from public.order_contributions
  where id = p_contribution_id and provider_id = auth.uid();
  if not found then raise exception 'Aporte no encontrado'; end if;

  delete from public.order_contributions where id = p_contribution_id and provider_id = auth.uid();

  select people into v_people from public.orders where id = v_order_id;
  select coalesce(sum(amount), 0) into v_total from public.order_contributions where order_id = v_order_id;

  if v_total >= v_people then
    update public.orders set status = 'done', done_at = now() where id = v_order_id;
  elsif v_total > 0 then
    update public.orders set status = 'progress', done_at = null where id = v_order_id;
  else
    update public.orders set status = 'pending', progress_at = null, done_at = null where id = v_order_id;
  end if;

  return jsonb_build_object('total', v_total, 'people', v_people);
end;
$$;

grant execute on function public.deshacer_aporte(uuid) to authenticated;

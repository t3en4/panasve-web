-- ============================================================
-- PanasVE — Migración: nombre del asignado + historial de pedidos
-- Ejecuta este archivo en: Supabase Dashboard > SQL Editor > New query
-- (Es seguro: solo agrega columnas y una tabla nueva, no borra nada.)
-- ============================================================

-- 1. Guardar el nombre del proveedor en el pedido (para mostrarlo a todos
--    sin violar las reglas de privacidad de perfiles)
alter table public.orders add column if not exists claimed_by_name text;

-- 2. Tabla de historial: un registro por cada cambio de estado
create table if not exists public.order_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  status      order_status not null,
  actor_name  text,                          -- quién hizo el cambio
  note        text,                          -- descripción legible
  created_at  timestamptz not null default now()
);

create index if not exists idx_order_history_order on public.order_history (order_id, created_at);

-- 3. Seguridad: historial visible para todos, escritura para usuarios autenticados
alter table public.order_history enable row level security;

drop policy if exists "historial - leer todos" on public.order_history;
create policy "historial - leer todos" on public.order_history
  for select using (true);

drop policy if exists "historial - crear" on public.order_history;
create policy "historial - crear" on public.order_history
  for insert with check (true);

-- 4. Registrar automáticamente el evento "creado" de cada pedido nuevo
create or replace function public.log_order_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.order_history (order_id, status, note)
  values (new.id, new.status, 'Pedido publicado');
  return new;
end; $$;

drop trigger if exists trg_log_order_created on public.orders;
create trigger trg_log_order_created
  after insert on public.orders
  for each row execute function public.log_order_created();

-- 5. Registrar automáticamente cada cambio de estado
create or replace function public.log_order_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  texto text;
begin
  if new.status is distinct from old.status then
    texto := case new.status
      when 'progress' then coalesce(new.claimed_by_name, 'Un proveedor') || ' tomó el pedido'
      when 'done'     then 'Pedido entregado por ' || coalesce(new.claimed_by_name, 'el proveedor')
      when 'pending'  then 'Pedido liberado, disponible de nuevo'
      else 'Estado cambiado'
    end;
    insert into public.order_history (order_id, status, actor_name, note)
    values (new.id, new.status, new.claimed_by_name, texto);
  end if;
  return new;
end; $$;

drop trigger if exists trg_log_order_status on public.orders;
create trigger trg_log_order_status
  after update on public.orders
  for each row execute function public.log_order_status_change();

-- ============================================================
-- LISTO. El historial se registra solo a partir de ahora.
-- ============================================================

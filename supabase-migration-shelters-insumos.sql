-- ============================================================
-- PanasVE — Migración: cuentas de refugio + insumos + cancelar
-- ============================================================
-- IMPORTANTE: ejecuta este archivo en DOS pasos en el SQL Editor.
-- Postgres no permite agregar valores a un enum y usarlos en la misma
-- transacción, así que corre primero el PASO 1, espera el "Success",
-- y luego corre el PASO 2.
-- ============================================================


-- ========================== PASO 1 ==========================
-- (Selecciona solo estas líneas y dale Run primero)

alter type user_role   add value if not exists 'shelter';
alter type order_status add value if not exists 'cancelled';

-- ============================================================
-- Después de ver "Success", continúa con el PASO 2.
-- ============================================================


-- ========================== PASO 2 ==========================
-- (Selecciona desde aquí hasta el final y dale Run)

-- 1. Vincular cada refugio a una cuenta de usuario
alter table public.shelters add column if not exists owner_id uuid references public.profiles(id) on delete set null;

-- 2. Tipo de pedido (comida o insumos) y lista de insumos
do $$ begin
  if not exists (select 1 from pg_type where typname = 'order_kind') then
    create type order_kind as enum ('comida', 'insumos');
  end if;
end $$;

alter table public.orders add column if not exists order_type order_kind not null default 'comida';
alter table public.orders add column if not exists items jsonb;  -- [{name, qty}], máx 20

-- 3. Comida y personas ahora son opcionales (los insumos no los usan)
alter table public.orders alter column people drop not null;
alter table public.orders alter column meals  drop not null;

-- 4. Permitir que el trigger de geo funcione también con owner (sin cambios extra)

-- 5. handle_new_user: ahora el rol puede ser 'provider' o 'shelter' según el registro
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_admin boolean;
  desired  text;
begin
  select exists(select 1 from public.admin_emails where email = new.email) into is_admin;
  desired := coalesce(new.raw_user_meta_data->>'role', 'provider');
  if desired not in ('provider', 'shelter') then desired := 'provider'; end if;

  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    case when is_admin then 'admin'::user_role else desired::user_role end
  );
  return new;
end; $$;

-- 6. Políticas RLS actualizadas
-- SHELTERS: lectura pública; crear/editar solo el dueño o admin
drop policy if exists "refugios - crear" on public.shelters;
create policy "refugios - crear" on public.shelters
  for insert with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "refugios - actualizar" on public.shelters;
create policy "refugios - dueño actualiza" on public.shelters
  for update using (owner_id = auth.uid() or public.is_admin());

-- ORDERS: crear solo si eres dueño del refugio; actualizar según rol
drop policy if exists "pedidos - crear" on public.orders;
create policy "pedidos - crear" on public.orders
  for insert with check (
    public.is_admin()
    or exists (select 1 from public.shelters s where s.id = shelter_id and s.owner_id = auth.uid())
  );

drop policy if exists "pedidos - proveedor o admin actualiza" on public.orders;
drop policy if exists "pedidos - actualizar" on public.orders;
create policy "pedidos - actualizar" on public.orders
  for update
  using (
    public.is_admin()
    or claimed_by = auth.uid()                                              -- proveedor que lo tomó
    or (status = 'pending' and exists (                                     -- proveedor toma uno libre
          select 1 from public.profiles p where p.id = auth.uid() and p.role = 'provider'))
    or (status = 'pending' and exists (                                     -- refugio dueño edita/cancela
          select 1 from public.shelters s where s.id = shelter_id and s.owner_id = auth.uid()))
  )
  with check (
    public.is_admin()
    or claimed_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'provider')
    or exists (select 1 from public.shelters s where s.id = shelter_id and s.owner_id = auth.uid())
  );

-- 7. Historial: incluir el evento de cancelación
create or replace function public.log_order_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare texto text;
begin
  if new.status is distinct from old.status then
    texto := case new.status
      when 'progress'  then coalesce(new.claimed_by_name, 'Un proveedor') || ' tomó el pedido'
      when 'done'      then 'Pedido entregado por ' || coalesce(new.claimed_by_name, 'el proveedor')
      when 'pending'   then 'Pedido liberado, disponible de nuevo'
      when 'cancelled' then 'Pedido cancelado por el refugio'
      else 'Estado cambiado'
    end;
    insert into public.order_history (order_id, status, actor_name, note)
    values (new.id, new.status, new.claimed_by_name, texto);
  end if;
  return new;
end; $$;

-- 8. Refrescar la vista de admin para incluir los campos nuevos
drop view if exists public.orders_full;
create view public.orders_full as
  select o.*,
         s.name  as shelter_name, s.location as shelter_location,
         s.phone as shelter_phone, s.email as shelter_email,
         s.contact as shelter_contact, s.instagram as shelter_instagram,
         p.name  as provider_name, p.email as provider_email, p.phone as provider_phone
  from public.orders o
  join public.shelters s on s.id = o.shelter_id
  left join public.profiles p on p.id = o.claimed_by;

-- ============================================================
-- LISTO. Ahora los refugios pueden registrarse y gestionar pedidos.
-- ============================================================

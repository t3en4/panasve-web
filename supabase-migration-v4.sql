-- ============================================================
-- PanasVE — Migración v4: ubicación propia por pedido
-- Corre todo en Supabase > SQL Editor > Run (seguro, solo agrega columnas)
-- ============================================================

-- Ubicación específica del pedido (se hereda del refugio, pero es editable)
alter table public.orders add column if not exists location text;
alter table public.orders add column if not exists lat double precision;
alter table public.orders add column if not exists lng double precision;

-- Rellenar los pedidos existentes con la ubicación de su refugio
update public.orders o
set location = s.location, lat = s.lat, lng = s.lng
from public.shelters s
where o.shelter_id = s.id
  and o.location is null;

-- Refrescar la vista de admin
drop view if exists public.orders_full;
create view public.orders_full as
  select o.*,
         s.name  as shelter_name, s.location as shelter_location, s.estado as shelter_estado,
         s.phone as shelter_phone, s.email as shelter_email,
         s.contact as shelter_contact, s.instagram as shelter_instagram,
         p.name  as provider_name, p.email as provider_email, p.phone as provider_phone,
         p.provider_type as provider_type
  from public.orders o
  join public.shelters s on s.id = o.shelter_id
  left join public.profiles p on p.id = o.claimed_by;

-- ============================================================
-- LISTO.
-- ============================================================

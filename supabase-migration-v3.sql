-- ============================================================
-- PanasVE — Migración v3: estado, tipo de proveedor, alergias
-- Corre todo esto en Supabase > SQL Editor > Run
-- (Seguro: solo agrega columnas, no borra nada.)
-- ============================================================

-- 1. Estado de Venezuela en refugios y perfiles (proveedores)
alter table public.shelters add column if not exists estado text;
alter table public.profiles add column if not exists estado text;

-- 2. Tipo de proveedor (restaurante, farmacia, chef, individuo, otro)
alter table public.profiles add column if not exists provider_type text;

-- 3. Alergias en pedidos (solo aplica a comida, pero la columna es general)
alter table public.orders add column if not exists allergies text;

-- 4. Refrescar la vista de admin con los campos nuevos
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

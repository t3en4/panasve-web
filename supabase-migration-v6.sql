-- ============================================================
-- PanasVE — Migración v6: tipo de solicitante (quien necesita ayuda)
-- Corre en Supabase > SQL Editor > Run (seguro, solo agrega columna)
-- ============================================================
-- Tipo de quien necesita ayuda: organizacion | refugio | individuo | otro

alter table public.shelters add column if not exists shelter_type text;

-- Los refugios existentes quedan como 'refugio' por defecto
update public.shelters set shelter_type = 'refugio' where shelter_type is null;

-- Refrescar la vista de admin para incluir el tipo
drop view if exists public.orders_full;
create view public.orders_full as
  select o.*,
         s.name  as shelter_name, s.location as shelter_location, s.estado as shelter_estado,
         s.shelter_type as shelter_type,
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

-- ============================================================
-- PanasVE — Migración v13: arreglar el aviso de seguridad
-- "Security Definer View" en public.orders_full
--
-- Recrea la vista con security_invoker = true, para que respete
-- las políticas RLS del usuario que consulta (no las del creador).
-- Corre en Supabase > SQL Editor > Run.
-- ============================================================

drop view if exists public.orders_full;

create view public.orders_full
with (security_invoker = true) as
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
-- NOTA IMPORTANTE:
-- Con security_invoker, la vista respeta el RLS de quien consulta.
-- El panel de admin usa esta vista; asegúrate de que los admin
-- tengan permiso de lectura sobre orders, shelters y profiles
-- vía políticas RLS (ya deberían tenerlo). Si el panel de admin
-- dejara de mostrar datos tras este cambio, es señal de que falta
-- una política de lectura para admins en alguna de esas tablas.
-- ============================================================

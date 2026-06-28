-- ============================================================
-- PanasVE — Migración v5: conteos públicos para el home
-- Corre en Supabase > SQL Editor > Run (seguro)
-- ============================================================
-- Devuelve solo números (no expone datos personales), accesible
-- por cualquier visitante para mostrar en el hero del home.

create or replace function public.stats_publicos()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'shelters', (select count(*) from public.shelters),
    'providers', (select count(*) from public.profiles where role = 'provider')
  );
$$;

-- Permitir que cualquiera (incluso sin sesión) la ejecute
grant execute on function public.stats_publicos() to anon, authenticated;

-- ============================================================
-- LISTO.
-- ============================================================

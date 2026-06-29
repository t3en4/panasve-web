-- ============================================================
-- PanasVE — Migración v7: historial de mensajes admin → usuario
-- Corre en Supabase > SQL Editor > Run (seguro)
-- ============================================================

create table if not exists public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  body text not null,
  sent_by uuid references auth.users(id),   -- admin que lo envió
  sent_by_email text,                         -- correo del admin (para mostrar fácil)
  created_at timestamptz not null default now()
);

alter table public.admin_messages enable row level security;

-- Solo los admins pueden ver el historial
drop policy if exists "admins ven mensajes" on public.admin_messages;
create policy "admins ven mensajes" on public.admin_messages
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- La inserción la hace la Edge Function con service role (sin política necesaria)

-- ============================================================
-- LISTO.
-- ============================================================

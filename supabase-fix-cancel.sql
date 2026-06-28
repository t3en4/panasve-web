-- ============================================================
-- PanasVE — Fix: permitir cancelar/editar pedidos
-- Corre esto en Supabase > SQL Editor > Run
-- ============================================================
-- El problema: la política de UPDATE solo tenía USING, que se aplicaba
-- también a la fila resultante. Al cancelar (pending -> cancelled), la
-- nueva fila ya no es 'pending', así que la regla la rechazaba.
-- Solución: USING evalúa la fila ANTERIOR; WITH CHECK evalúa la NUEVA.

drop policy if exists "pedidos - actualizar" on public.orders;

create policy "pedidos - actualizar" on public.orders
  for update
  using (
    -- Quién puede tocar la fila (según su estado ACTUAL)
    public.is_admin()
    or claimed_by = auth.uid()
    or (status = 'pending' and exists (
          select 1 from public.profiles p where p.id = auth.uid() and p.role = 'provider'))
    or (status = 'pending' and exists (
          select 1 from public.shelters s where s.id = shelter_id and s.owner_id = auth.uid()))
  )
  with check (
    -- Qué resultado se permite (según la fila NUEVA)
    public.is_admin()
    or claimed_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'provider')
    or exists (select 1 from public.shelters s where s.id = shelter_id and s.owner_id = auth.uid())
  );

-- ============================================================
-- LISTO. Ahora cancelar y editar pedidos pendientes funciona.
-- ============================================================

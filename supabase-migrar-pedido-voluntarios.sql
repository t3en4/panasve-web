-- ============================================================
-- PanasVE — Migrar el pedido mal categorizado a "voluntarios"
-- (pedía 25 voluntarios para manejar a La Guaira, pero se creó como comida)
-- IMPORTANTE: corre PRIMERO la migración v14 (crea el tipo 'voluntarios').
-- ============================================================

-- PASO 1 — Ubicar el pedido. Ajusta el filtro si hace falta.
select o.id, o.order_type, o.people, o.meals, o.notes, o.status,
       s.name as solicitante, o.created_at
from public.orders o
join public.shelters s on s.id = o.shelter_id
where o.order_type = 'comida'
  and (o.notes ilike '%voluntario%' or o.notes ilike '%guaira%'
       or o.notes ilike '%manej%' or o.notes ilike '%chofer%'
       or o.notes ilike '%conduc%')
order by o.created_at desc;

-- Copia el `id` del pedido correcto de los resultados de arriba.

-- ------------------------------------------------------------
-- PASO 2 — Convertirlo a voluntarios.
-- Reemplaza:
--   'PEGA_AQUI_EL_ID'  por el id del pedido
--   people             por la cantidad de voluntarios (ej. 25)
--   purpose            por el propósito real (para qué se necesitan)
-- ------------------------------------------------------------
update public.orders
set order_type = 'voluntarios',
    people     = 25,                                   -- cantidad de voluntarios
    purpose    = 'Manejar vehículos para llevar ayuda a La Guaira',  -- ajústalo
    meals      = null,                                 -- ya no aplica
    allergies  = null,
    items      = null
where id = 'PEGA_AQUI_EL_ID';

-- PASO 3 — Verificar
-- select id, order_type, people, purpose, meals, status
-- from public.orders where id = 'PEGA_AQUI_EL_ID';

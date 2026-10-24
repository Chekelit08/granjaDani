-- Un cajero (cuenta Mostrador) NO puede ver egresos, auditoría ni historial, ni tocar precios.
begin;
select plan(17);

set local role authenticated;
set local request.jwt.claims = '{"sub": "b0000000-0000-4000-8000-000000000002", "role": "authenticated"}';

select is_empty('select * from public.egresos', 'el cajero no ve egresos');
select is_empty('select * from public.categorias_egreso', 'el cajero no ve categorías de egreso');
select is_empty('select * from public.auditoria', 'el cajero no ve la auditoría');
select is_empty('select * from public.jornadas', 'el cajero no ve días anteriores cerrados');
select is_empty('select * from public.ventas', 'el cajero no ve ventas de días cerrados');
select is_empty(
  $$select * from public.perfiles where id <> 'b0000000-0000-4000-8000-000000000002'$$,
  'el cajero no ve otros usuarios'
);
select isnt_empty('select * from public.productos', 'el cajero ve los productos (los necesita la caja)');

-- Precios: los cambia solo el admin (sin política, el update no toca nada).
update public.productos set precio = 1 where nombre = 'Milanesa';
reset role;
select isnt((select precio from public.productos where nombre = 'Milanesa'), 1.00::numeric, 'el cajero no cambia precios');
set local role authenticated;
select throws_ok(
  $$insert into public.productos (nombre) values ('Producto trucho')$$,
  '42501', null, 'el cajero no crea productos'
);

select throws_ok(
  $$insert into public.ventas (jornada_id, ticket_id, producto_id, importe, medio_pago, registrada_por)
    values (gen_random_uuid(), gen_random_uuid(), (select id from public.productos limit 1), 100, 'efectivo', auth.uid())$$,
  '42501', null, 'el cajero no inserta ventas directo: tiene que usar registrar_ticket'
);
select throws_ok(
  $$select * from public.resumen_periodo(current_date - 30, current_date)$$,
  '42501', 'Esta acción es solo para administradores.', 'el cajero no ve resúmenes históricos'
);
select throws_ok(
  $$select * from public.planilla_periodo(current_date - 30, current_date)$$,
  '42501', null, 'el cajero no ve la planilla de un período'
);
select is_empty(
  $$select * from public.planilla_jornada((select id from public.jornadas order by fecha desc limit 1))$$,
  'el cajero no puede pedir la planilla de un día anterior'
);
select is_empty(
  $$select * from public.resumen_jornada((select id from public.jornadas order by fecha desc limit 1))$$,
  'el cajero no puede pedir el resumen de un día anterior'
);

-- Intentar subirse de rol no tiene efecto (no hay política de update para él).
update public.perfiles set rol = 'admin' where id = auth.uid();
select is(
  (select rol::text from public.perfiles where id = auth.uid()), 'cajero',
  'el cajero no puede cambiarse el rol'
);

-- Anónimos: nada.
reset role;
set local role anon;
select throws_ok('select * from public.ventas', '42501', null, 'un anónimo no puede leer ventas');
select throws_ok(
  $$select public.registrar_ticket('efectivo', '[]'::jsonb)$$, '42501', null,
  'un anónimo no puede cargar ventas'
);

select * from finish();
rollback;

-- Flujo del día y reglas de negocio de la caja: tickets por producto, planilla y cierre.
begin;
select plan(32);

-- Precios conocidos para poder verificar los totales.
update public.productos set precio = 10000 where nombre = 'Milanesa';
update public.productos set precio = 1000 where nombre = 'Papa';
update public.productos set activo = false where nombre = 'Menudo';

create temporary table ids on commit drop as
select (select id from public.productos where nombre = 'Milanesa') as milanesa,
       (select id from public.productos where nombre = 'Papa') as papa,
       (select id from public.productos where nombre = 'Huevo') as huevo,
       (select id from public.productos where nombre = 'Menudo') as menudo;
grant select on ids to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub": "b0000000-0000-4000-8000-000000000002", "role": "authenticated"}';

-- Abrir el día
select lives_ok($$select public.abrir_jornada(10000)$$, 'el cajero abre el día con fondo de caja');
select is((select count(*)::int from public.jornadas where estado = 'abierta'), 1, 'hay una sola jornada abierta');
select throws_ok($$select public.abrir_jornada(0)$$, 'P0001', 'El día de hoy ya está abierto.', 'no se abre dos veces');
select throws_ok($$select public.abrir_jornada(-5)$$, 'P0001', null, 'el fondo no puede ser negativo');

-- Cargar tickets
select is(
  (select count(*)::int from public.registrar_ticket('efectivo', jsonb_build_array(
    jsonb_build_object('producto_id', (select milanesa from ids), 'cantidad', 1.5, 'importe', 15000),
    jsonb_build_object('producto_id', (select papa from ids), 'cantidad', 2, 'importe', 2000)
  ))),
  2, 'un ticket con dos productos crea dos ventas'
);
select is(
  (select count(distinct ticket_id)::int from public.ventas),
  1, 'las dos ventas comparten el ticket'
);
select is(
  (select precio_unitario from public.ventas where producto_id = (select milanesa from ids)),
  10000.00::numeric, 'la venta guarda el precio que tenía el producto'
);
select lives_ok(
  $$select public.registrar_ticket('mercadopago', jsonb_build_array(
    jsonb_build_object('producto_id', (select milanesa from ids), 'cantidad', 0.5, 'importe', 5000)))$$,
  'carga un ticket con Mercado Pago'
);
select lives_ok(
  $$select public.registrar_ticket('efectivo', jsonb_build_array(
    jsonb_build_object('producto_id', (select huevo from ids), 'importe', 3000)))$$,
  'la cantidad es opcional (venta por importe)'
);
select lives_ok(
  $$select public.registrar_ticket('efectivo', jsonb_build_array(
    jsonb_build_object('producto_id', (select papa from ids), 'cantidad', 4, 'importe', 4000)))$$,
  'carga otro ticket en efectivo'
);

select throws_ok(
  $$select public.registrar_ticket(null, jsonb_build_array(
    jsonb_build_object('producto_id', (select papa from ids), 'importe', 100)))$$,
  'P0001', 'Elegí si pagó en efectivo o con Mercado Pago.', 'el medio es obligatorio'
);
select throws_ok(
  $$select public.registrar_ticket('efectivo', '[]'::jsonb)$$,
  'P0001', 'Agregá al menos un producto.', 'un ticket vacío se rechaza'
);
select throws_ok(
  $$select public.registrar_ticket('efectivo', jsonb_build_array(
    jsonb_build_object('producto_id', (select papa from ids), 'importe', 0)))$$,
  'P0001', 'El importe de Papa tiene que ser mayor a $ 0.', 'importe 0 rechazado'
);
select throws_ok(
  $$select public.registrar_ticket('efectivo', jsonb_build_array(
    jsonb_build_object('producto_id', (select papa from ids), 'importe', 10000000)))$$,
  'P0001', null, 'importe gigante rechazado'
);
select throws_ok(
  $$select public.registrar_ticket('efectivo', jsonb_build_array(
    jsonb_build_object('producto_id', (select papa from ids), 'cantidad', -1, 'importe', 100)))$$,
  'P0001', 'Revisá la cantidad de Papa.', 'cantidad negativa rechazada'
);
select throws_ok(
  $$select public.registrar_ticket('efectivo', jsonb_build_array(
    jsonb_build_object('producto_id', (select menudo from ids), 'importe', 100)))$$,
  'P0001', '"Menudo" ya no se vende. Actualizá la página.', 'un producto inactivo no se vende'
);
select is(
  (select count(*)::int from public.ventas), 5,
  'un ticket rechazado no deja ventas sueltas'
);

-- Anular: el ticket de papa (propio y reciente) sí
select lives_ok(
  $$select public.anular_ticket((select ticket_id from public.ventas where cantidad = 4), 'Error de carga')$$,
  'el cajero anula su ticket reciente'
);
select throws_ok(
  $$select public.anular_ticket((select ticket_id from public.ventas where cantidad = 4), 'otra vez')$$,
  'P0001', 'Ese ticket no tiene ventas para anular.', 'no se anula dos veces'
);
select throws_ok(
  $$select public.anular_venta((select id from public.ventas where cantidad = 0.5), '')$$,
  'P0001', null, 'anular exige motivo'
);

-- Anular: de hace más de 10 minutos no
reset role;
set local session_replication_role = replica;
update public.ventas set registrada_en = now() - interval '11 minutes' where cantidad = 0.5;
set local session_replication_role = origin;
set local role authenticated;
select throws_ok(
  $$select public.anular_venta((select id from public.ventas where cantidad = 0.5), 'Me equivoqué')$$,
  '42501', 'Pasaron más de 10 minutos: solo un administrador puede anular esta venta.',
  'el cajero no anula ventas viejas'
);

-- Salida de caja
select lives_ok($$select public.registrar_salida(1000, 'retiro')$$, 'el cajero saca efectivo');

-- Resumen y planilla
select results_eq(
  $$select total, total_efectivo, total_mercadopago, cantidad_tickets, cantidad_anuladas, kilos, efectivo_esperado
    from public.resumen_jornada((select id from public.jornadas where estado = 'abierta'))$$,
  $$values (25000.00::numeric, 20000.00::numeric, 5000.00::numeric, 3::bigint, 1::bigint, 4.000::numeric, 29000.00::numeric)$$,
  'el resumen excluye anuladas, cuenta tickets y suma fondo + efectivo − salidas'
);
select results_eq(
  $$select nombre, cantidad, total, total_efectivo, total_mercadopago
    from public.planilla_jornada((select id from public.jornadas where estado = 'abierta'))
    where nombre in ('Milanesa', 'Papa', 'Huevo') order by orden$$,
  $$values ('Milanesa', 2.000::numeric, 20000.00::numeric, 15000.00::numeric, 5000.00::numeric),
           ('Huevo', 0::numeric, 3000.00::numeric, 3000.00::numeric, 0::numeric),
           ('Papa', 2.000::numeric, 2000.00::numeric, 2000.00::numeric, 0::numeric)$$,
  'la planilla suma KG, $, EFE y MP por producto'
);
select is(
  (select count(*)::int from public.planilla_jornada((select id from public.jornadas where estado = 'abierta'))),
  12, 'la planilla trae los productos activos aunque no se hayan vendido'
);

-- Las ventas no se editan ni se borran, ni siquiera desde la base
reset role;
select throws_ok(
  $$update public.ventas set importe = 1 where cantidad = 1.5$$,
  'P0001', 'Una venta no se edita: anulala y cargala de nuevo.', 'una venta no se edita'
);
select throws_ok(
  $$delete from public.ventas where cantidad = 1.5$$,
  'P0001', 'Las ventas no se borran: se anulan con un motivo.', 'una venta no se borra'
);
set local role authenticated;

-- Cerrar el día
select lives_ok(
  $$select public.cerrar_jornada((select id from public.jornadas where estado = 'abierta'), 28500, 'Faltan 500')$$,
  'el cajero cierra el día'
);
select is(
  (select diferencia_efectivo from public.jornadas where fecha = public.hoy_ar()),
  -500.00::numeric, 'la diferencia es contado − esperado'
);
select is(
  (select total from public.resumen_jornada((select id from public.jornadas where fecha = public.hoy_ar()))),
  25000.00::numeric, 'el cajero ve el resumen del día de hoy ya cerrado'
);
select throws_ok(
  $$select public.registrar_ticket('efectivo', jsonb_build_array(
    jsonb_build_object('producto_id', (select papa from ids), 'importe', 100)))$$,
  'P0001', 'No hay un día abierto. Abrí el día para seguir.', 'no se carga en un día cerrado'
);
select throws_ok(
  $$select public.reabrir_jornada((select id from public.jornadas where fecha = public.hoy_ar()))$$,
  '42501', 'Esta acción es solo para administradores.', 'el cajero no reabre días'
);

select * from finish();
rollback;

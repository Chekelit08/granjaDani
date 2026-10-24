-- Lo que puede hacer un admin, y que quede en la auditoría.
begin;
select plan(17);

set local role authenticated;
set local request.jwt.claims = '{"sub": "b0000000-0000-4000-8000-000000000001", "role": "authenticated"}';

select isnt_empty('select * from public.egresos', 'el admin ve egresos');
select isnt_empty('select * from public.jornadas where fecha < public.hoy_ar()', 'el admin ve días anteriores');
select isnt_empty('select * from public.facturacion_por_dia(public.hoy_ar() - 30, public.hoy_ar())', 'el admin ve la facturación diaria');
select ok((select total > 0 from public.resumen_periodo(public.hoy_ar() - 30, public.hoy_ar())), 'el resumen del período tiene ventas');
select is(
  (select sum(total) from public.planilla_periodo(public.hoy_ar() - 30, public.hoy_ar())),
  (select total from public.resumen_periodo(public.hoy_ar() - 30, public.hoy_ar())),
  'la planilla del período suma lo mismo que el resumen'
);

-- Productos y precios
select lives_ok(
  $$update public.productos set precio = 12345 where nombre = 'Milanesa'$$,
  'el admin cambia un precio'
);
select ok(
  exists (select 1 from public.auditoria where accion = 'cambiar_precio' and usuario_nombre = 'Dani'),
  'el cambio de precio queda en la auditoría'
);
select lives_ok(
  $$insert into public.productos (nombre, unidad, precio, orden) values ('Hamburguesas', 'unidad', 900, 140)$$,
  'el admin agrega un producto'
);
select throws_ok(
  $$insert into public.productos (nombre) values ('milanesa')$$,
  '23505', null, 'no se repite un nombre de producto'
);

-- Reabrir un día queda en auditoría con nombre
select lives_ok(
  $$select public.reabrir_jornada((select id from public.jornadas where estado = 'cerrada' order by fecha desc limit 1))$$,
  'el admin reabre un día cerrado'
);
select ok(
  exists (select 1 from public.auditoria where accion = 'reabrir_jornada' and usuario_nombre = 'Dani'),
  'la reapertura queda registrada con nombre'
);
select throws_ok(
  $$select public.reabrir_jornada((select id from public.jornadas where estado = 'cerrada' limit 1))$$,
  'P0001', null, 'no se reabre otro día mientras hay uno abierto'
);

-- El admin anula una venta vieja del día reabierto
select lives_ok(
  $$select public.anular_venta(
      (select v.id from public.ventas v join public.jornadas j on j.id = v.jornada_id
       where j.estado = 'abierta' and not v.anulada limit 1), 'Cargada dos veces')$$,
  'el admin anula una venta de más de 10 minutos'
);

-- Un día que quedó abierto de antes bloquea abrir hoy
select throws_ok($$select public.abrir_jornada(0)$$, 'P0001', null, 'con un día viejo abierto no se abre otro');

-- El admin cambia el nombre, pero no el email ni la marca de clave temporal
update public.perfiles set email = 'otro@x.com', debe_cambiar_clave = true, nombre = 'Caja 1'
where id = 'b0000000-0000-4000-8000-000000000002';
select is(
  (select email || '|' || debe_cambiar_clave::text || '|' || nombre from public.perfiles where id = 'b0000000-0000-4000-8000-000000000002'),
  'mostrador@usuarios.granja-dani.app|false|Caja 1', 'el admin no cambia email ni clave temporal desde la app'
);
select throws_ok(
  $$select public.registrar_auditoria_servicio(auth.uid(), 'x', null, null)$$,
  '42501', null, 'la auditoría de servicio no se puede llamar desde la app'
);

-- No se puede quedar sin admins
select throws_ok(
  $$update public.perfiles set rol = 'cajero' where id = 'b0000000-0000-4000-8000-000000000001'$$,
  'P0001', 'Tiene que quedar al menos un administrador activo.', 'siempre queda un admin activo'
);

select * from finish();
rollback;

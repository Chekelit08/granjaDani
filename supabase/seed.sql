-- =============================================================================
-- Datos de prueba para desarrollo local (npx supabase db reset).
-- NO se usa en producción: el primer admin real se crea con scripts/crear-admin.mjs.
--
-- Usuarios (contraseña para todos: granja-prueba-2026)
--   dani       admin  (dueño)
--   mostrador  cajero (cuenta compartida del mostrador)
--
-- Precios de lista, 60 días de ventas por producto (domingos cerrado) y egresos.
-- Hoy queda sin abrir, para poder probar "Abrir el día".
-- =============================================================================

-- Los triggers de reglas y auditoría se apagan durante la carga masiva.
set session_replication_role = replica;

select setseed(0.42);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('granja-prueba-2026', extensions.gen_salt('bf')), now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'rol', u.rol),
  jsonb_build_object('nombre', u.nombre), now(), now(), '', '', '', ''
from (values
  ('b0000000-0000-4000-8000-000000000001'::uuid, 'dani@usuarios.granja-dani.app', 'Dani', 'admin'),
  ('b0000000-0000-4000-8000-000000000002'::uuid, 'mostrador@usuarios.granja-dani.app', 'Mostrador', 'cajero')
) as u (id, email, nombre, rol);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text,
       jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users
where email like '%@usuarios.granja-dani.app';

insert into public.perfiles (id, nombre, email, rol) values
  ('b0000000-0000-4000-8000-000000000001', 'Dani', 'dani@usuarios.granja-dani.app', 'admin'),
  ('b0000000-0000-4000-8000-000000000002', 'Mostrador', 'mostrador@usuarios.granja-dani.app', 'cajero');

-- Precios de lista (por kilo; el huevo por unidad).
update public.productos p
set precio = x.precio
from (values
  ('Milanesa', 9800), ('Pata y muslo', 5200), ('Alitas', 3900), ('Pechuga', 8900),
  ('Trozado', 4800), ('Congelado', 6500), ('Huevo', 250), ('Pollo', 4300),
  ('Papa', 900), ('Cebolla', 1100), ('Pan rallado', 2600), ('B. horno y condimento', 3200),
  ('Menudo', 2400)
) as x (nombre, precio)
where p.nombre = x.nombre;

-- Jornadas: últimos 60 días, sin domingos y sin hoy.
-- Se cargan ya cerradas (la base no admite dos abiertas); el arqueo se completa más abajo.
insert into public.jornadas (
  id, fecha, estado, fondo_inicial, abierta_por, abierta_en,
  cerrada_por, cerrada_en, efectivo_contado, diferencia_efectivo
)
select gen_random_uuid(), d::date, 'cerrada',
       (array[0, 5000, 10000, 10000, 20000])[1 + floor(random() * 5)::int],
       'b0000000-0000-4000-8000-000000000002',
       (d::date + time '08:00') at time zone 'America/Argentina/Buenos_Aires',
       'b0000000-0000-4000-8000-000000000002',
       (d::date + time '20:30') at time zone 'America/Argentina/Buenos_Aires',
       0, 0
from generate_series(public.hoy_ar() - 60, public.hoy_ar() - 1, interval '1 day') d
where extract(isodow from d) <> 7;

-- Tickets: más los viernes y sábados. Cada uno con 1 a 3 productos y un medio de pago.
create temporary table tickets_semilla as
select gen_random_uuid() as ticket_id, j.id as jornada_id,
       case when random() < 0.55 then 'efectivo'::public.medio_pago else 'mercadopago'::public.medio_pago end as medio,
       (j.fecha + time '08:30' + (random() * interval '11 hours')) at time zone 'America/Argentina/Buenos_Aires' as hora,
       1 + floor(random() * random() * 3.5)::int as items
from public.jornadas j
cross join lateral generate_series(
  1,
  (case extract(isodow from j.fecha)
     when 5 then 55 when 6 then 70 when 1 then 30 else 40 end
   + floor(random() * 15))::int
) n;

-- Los productos más vendidos aparecen más seguido (peso).
create temporary table pesos_semilla as
select p.id, p.precio, p.unidad, x.peso, x.minimo, x.maximo,
       sum(x.peso) over (order by p.orden) - x.peso as desde,
       sum(x.peso) over (order by p.orden) as hasta,
       sum(x.peso) over () as total
from public.productos p
join (values
  ('Milanesa', 14, 0.5, 2.5), ('Pata y muslo', 12, 1.0, 3.0), ('Alitas', 6, 0.5, 2.0),
  ('Pechuga', 9, 0.5, 2.0), ('Trozado', 7, 1.0, 3.0), ('Congelado', 5, 0.5, 2.0),
  ('Huevo', 10, 6, 30), ('Pollo', 12, 1.8, 3.2), ('Papa', 8, 1.0, 5.0),
  ('Cebolla', 5, 0.5, 2.0), ('Pan rallado', 3, 0.5, 1.0), ('B. horno y condimento', 3, 0.1, 0.5),
  ('Menudo', 4, 0.5, 1.5)
) as x (nombre, peso, minimo, maximo) on x.nombre = p.nombre;

insert into public.ventas (jornada_id, ticket_id, producto_id, cantidad, precio_unitario, importe, medio_pago, registrada_por, registrada_en)
select t.jornada_id, t.ticket_id, p.id, c.cantidad, p.precio,
       greatest(100, round(c.cantidad * p.precio / 10) * 10),
       t.medio, 'b0000000-0000-4000-8000-000000000002', t.hora
from tickets_semilla t
cross join lateral (
  select random() * (select max(total) from pesos_semilla) as r from generate_series(1, t.items)
) azar
join pesos_semilla p on azar.r >= p.desde and azar.r < p.hasta
cross join lateral (
  select case when p.unidad = 'unidad'
              then (array[6, 12, 12, 30])[1 + floor(random() * 4)::int]::numeric
              else round((p.minimo + random() * (p.maximo - p.minimo))::numeric, 3)
         end as cantidad
) c;

-- Unas pocas anuladas (errores de carga).
update public.ventas
set anulada = true,
    anulada_por = registrada_por,
    anulada_en = registrada_en + interval '2 minutes',
    motivo_anulacion = 'Error de carga'
where random() < 0.01;

-- Algún pago a proveedor desde la caja (los martes).
insert into public.salidas_caja (jornada_id, importe, motivo, detalle, registrada_por, registrada_en)
select j.id, 150000, 'proveedor', 'Huevos La Colina', 'b0000000-0000-4000-8000-000000000002',
       (j.fecha + time '10:00') at time zone 'America/Argentina/Buenos_Aires'
from public.jornadas j
where extract(isodow from j.fecha) = 2;

-- Arqueo de cada día, casi siempre exacto.
update public.jornadas j
set efectivo_contado = e.esperado + e.diferencia,
    diferencia_efectivo = e.diferencia,
    nota_cierre = case when e.diferencia < 0 then 'Faltó cambio, revisar' end
from (
  select j2.id,
         public.efectivo_esperado(j2.id) as esperado,
         case when random() < 0.8 then 0 else (array[-1500, -500, 200, 1000])[1 + floor(random() * 4)::int] end as diferencia
  from public.jornadas j2
) e
where e.id = j.id;

-- Egresos fijos de cada mes.
insert into public.egresos (fecha, categoria_id, descripcion, proveedor, monto, medio_pago, registrado_por)
select d::date, c.id, x.descripcion, x.proveedor, x.monto, x.medio::public.medio_pago,
       'b0000000-0000-4000-8000-000000000001'
from generate_series(date_trunc('month', public.hoy_ar() - 60), public.hoy_ar() - 1, interval '1 month') d
cross join (values
  ('Alquiler', 'Alquiler del local', 'Inmobiliaria Centro', 650000, 'mercadopago'),
  ('Servicios', 'Luz', 'Edenor', 180000, 'mercadopago'),
  ('Servicios', 'Internet', 'Fibertel', 24000, 'mercadopago'),
  ('Sueldos', 'Sueldo ayudante', null, 700000, 'efectivo'),
  ('Impuestos', 'Monotributo', 'ARCA', 95000, 'mercadopago')
) as x (categoria, descripcion, proveedor, monto, medio)
join public.categorias_egreso c on c.nombre = x.categoria
where d::date + 4 <= public.hoy_ar();

-- Mercadería: dos compras por semana al frigorífico avícola.
insert into public.egresos (fecha, categoria_id, descripcion, proveedor, monto, medio_pago, registrado_por)
select d::date,
       (select id from public.categorias_egreso where nombre = 'Mercadería'),
       'Pollo, trozado y menudencias', 'Avícola del Sur',
       round(900000 * (0.85 + random() * 0.3) / 1000) * 1000,
       case when random() < 0.5 then 'efectivo'::public.medio_pago else 'mercadopago'::public.medio_pago end,
       'b0000000-0000-4000-8000-000000000001'
from generate_series(public.hoy_ar() - 60, public.hoy_ar() - 1, interval '1 day') d
where extract(isodow from d) in (1, 4);

drop table tickets_semilla, pesos_semilla;

set session_replication_role = origin;

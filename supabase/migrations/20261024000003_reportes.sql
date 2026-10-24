-- =============================================================================
-- Granja Los Amigos — reportes
-- Los totales los calcula la base y excluyen lo anulado.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Resumen de una jornada.
-- El admin resume cualquier día. Un cajero, solo el día abierto o el de hoy
-- (para ver el resumen del día que acaba de cerrar), aunque ya no vea sus ventas.
-- -----------------------------------------------------------------------------
create function public.resumen_jornada(p_jornada_id uuid)
returns table (
  jornada_id uuid,
  fecha date,
  estado public.estado_jornada,
  total numeric,
  total_efectivo numeric,
  total_mercadopago numeric,
  cantidad_tickets bigint,
  cantidad_efectivo bigint,
  cantidad_mercadopago bigint,
  cantidad_anuladas bigint,
  ticket_promedio numeric,
  kilos numeric,
  fondo_inicial numeric,
  total_salidas numeric,
  cantidad_salidas bigint,
  efectivo_esperado numeric,
  efectivo_contado numeric,
  diferencia_efectivo numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with v as (
    select * from public.ventas where jornada_id = p_jornada_id
  ),
  tickets as (
    select ticket_id, medio_pago, sum(importe) as total
    from v where not anulada
    group by ticket_id, medio_pago
  )
  select
    j.id,
    j.fecha,
    j.estado,
    coalesce((select sum(importe) from v where not anulada), 0),
    coalesce((select sum(importe) from v where not anulada and medio_pago = 'efectivo'), 0),
    coalesce((select sum(importe) from v where not anulada and medio_pago = 'mercadopago'), 0),
    (select count(*) from tickets),
    (select count(*) from tickets where medio_pago = 'efectivo'),
    (select count(*) from tickets where medio_pago = 'mercadopago'),
    (select count(*) from v where anulada),
    coalesce((select round(avg(total), 2) from tickets), 0),
    coalesce((select sum(v.cantidad) from v join public.productos p on p.id = v.producto_id
              where not v.anulada and p.unidad = 'kg'), 0),
    j.fondo_inicial,
    coalesce((select sum(s.importe) from public.salidas_caja s where s.jornada_id = j.id and not s.anulada), 0),
    (select count(*) from public.salidas_caja s where s.jornada_id = j.id and not s.anulada),
    public.efectivo_esperado(j.id),
    j.efectivo_contado,
    j.diferencia_efectivo
  from public.jornadas j
  where j.id = p_jornada_id
    and (public.es_admin() or (public.usuario_activo() and (j.estado = 'abierta' or j.fecha = public.hoy_ar())));
$$;

-- -----------------------------------------------------------------------------
-- La planilla del día: por producto, KG · $ · EFE · MP (como la hoja de papel).
-- Incluye todos los productos activos (aunque no se hayan vendido) y los
-- inactivos que tuvieron ventas. Mismos permisos que resumen_jornada.
-- -----------------------------------------------------------------------------
create function public.planilla_jornada(p_jornada_id uuid)
returns table (
  producto_id uuid,
  nombre text,
  unidad public.unidad_producto,
  orden int,
  cantidad numeric,
  total numeric,
  total_efectivo numeric,
  total_mercadopago numeric,
  ventas bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.nombre, p.unidad, p.orden,
         coalesce(sum(v.cantidad), 0),
         coalesce(sum(v.importe), 0),
         coalesce(sum(v.importe) filter (where v.medio_pago = 'efectivo'), 0),
         coalesce(sum(v.importe) filter (where v.medio_pago = 'mercadopago'), 0),
         count(v.id)
  from public.productos p
  left join public.ventas v
    on v.producto_id = p.id and v.jornada_id = p_jornada_id and not v.anulada
  where exists (
      select 1 from public.jornadas j
      where j.id = p_jornada_id
        and (public.es_admin() or (public.usuario_activo() and (j.estado = 'abierta' or j.fecha = public.hoy_ar())))
    )
  group by p.id
  having p.activo or count(v.id) > 0
  order by p.orden, p.nombre;
$$;

-- La misma planilla para un período (solo admin).
create function public.planilla_periodo(p_desde date, p_hasta date)
returns table (
  producto_id uuid,
  nombre text,
  unidad public.unidad_producto,
  orden int,
  cantidad numeric,
  total numeric,
  total_efectivo numeric,
  total_mercadopago numeric,
  ventas bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.exigir_admin();
  if p_hasta < p_desde then
    raise exception 'La fecha "hasta" no puede ser anterior a "desde".' using errcode = 'P0001';
  end if;

  return query
  select p.id, p.nombre, p.unidad, p.orden,
         coalesce(sum(v.cantidad), 0),
         coalesce(sum(v.importe), 0),
         coalesce(sum(v.importe) filter (where v.medio_pago = 'efectivo'), 0),
         coalesce(sum(v.importe) filter (where v.medio_pago = 'mercadopago'), 0),
         count(v.id)
  from public.productos p
  left join (
    select v.* from public.ventas v
    join public.jornadas j on j.id = v.jornada_id
    where j.fecha between p_desde and p_hasta and not v.anulada
  ) v on v.producto_id = p.id
  group by p.id
  having p.activo or count(v.id) > 0
  order by p.orden, p.nombre;
end;
$$;

-- -----------------------------------------------------------------------------
-- Resumen de un período cualquiera (semana, mes, rango).
-- -----------------------------------------------------------------------------
create function public.resumen_periodo(p_desde date, p_hasta date)
returns table (
  desde date,
  hasta date,
  total numeric,
  total_efectivo numeric,
  total_mercadopago numeric,
  cantidad_tickets bigint,
  ticket_promedio numeric,
  kilos numeric,
  dias_trabajados bigint,
  promedio_diario numeric,
  diferencia_caja numeric,
  mejor_dia date,
  mejor_dia_total numeric
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.exigir_admin();
  if p_hasta < p_desde then
    raise exception 'La fecha "hasta" no puede ser anterior a "desde".' using errcode = 'P0001';
  end if;

  return query
  with vv as (
    select v.*, j.fecha, p.unidad
    from public.ventas v
    join public.jornadas j on j.id = v.jornada_id
    join public.productos p on p.id = v.producto_id
    where j.fecha between p_desde and p_hasta and not v.anulada
  ),
  por_dia as (
    select j.fecha, j.diferencia_efectivo,
           coalesce((select sum(importe) from vv where vv.jornada_id = j.id), 0) as total
    from public.jornadas j
    where j.fecha between p_desde and p_hasta
  ),
  mejor as (
    select fecha, total from por_dia where total > 0 order by total desc, fecha limit 1
  ),
  tickets as (select count(distinct ticket_id) as n from vv)
  select
    p_desde,
    p_hasta,
    coalesce((select sum(importe) from vv), 0),
    coalesce((select sum(importe) from vv where medio_pago = 'efectivo'), 0),
    coalesce((select sum(importe) from vv where medio_pago = 'mercadopago'), 0),
    (select n from tickets),
    case when (select n from tickets) > 0
      then round((select sum(importe) from vv) / (select n from tickets), 2) else 0 end,
    coalesce((select sum(cantidad) from vv where unidad = 'kg'), 0),
    (select count(*) from por_dia),
    case when (select count(*) from por_dia) > 0
      then round((select sum(total) from por_dia) / (select count(*) from por_dia), 2) else 0 end,
    coalesce((select sum(diferencia_efectivo) from por_dia), 0),
    (select fecha from mejor),
    (select total from mejor);
end;
$$;

-- Facturación día por día, con los días sin jornada (cerrado) marcados.
create function public.facturacion_por_dia(p_desde date, p_hasta date)
returns table (
  fecha date,
  trabajado boolean,
  total numeric,
  total_efectivo numeric,
  total_mercadopago numeric,
  cantidad_tickets bigint,
  kilos numeric
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.exigir_admin();
  if p_hasta - p_desde > 400 then
    raise exception 'Elegí un rango de hasta 400 días.' using errcode = 'P0001';
  end if;

  return query
  select
    dia::date,
    j.id is not null,
    coalesce(sum(v.importe), 0),
    coalesce(sum(v.importe) filter (where v.medio_pago = 'efectivo'), 0),
    coalesce(sum(v.importe) filter (where v.medio_pago = 'mercadopago'), 0),
    count(distinct v.ticket_id),
    coalesce(sum(v.cantidad) filter (where p.unidad = 'kg'), 0)
  from generate_series(p_desde, p_hasta, interval '1 day') as dia
  left join public.jornadas j on j.fecha = dia::date
  left join public.ventas v on v.jornada_id = j.id and not v.anulada
  left join public.productos p on p.id = v.producto_id
  group by dia, j.id
  order by dia;
end;
$$;

-- Facturación agrupada por semana (lunes a domingo) o por mes.
create function public.facturacion_agrupada(p_desde date, p_hasta date, p_unidad text)
returns table (
  periodo date,
  total numeric,
  total_efectivo numeric,
  total_mercadopago numeric,
  cantidad_tickets bigint,
  dias_trabajados bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.exigir_admin();
  if p_unidad not in ('week', 'month') then
    raise exception 'Unidad inválida: usá week o month.' using errcode = 'P0001';
  end if;

  return query
  with por_dia as (
    select j.fecha,
           coalesce(sum(v.importe), 0) as total,
           coalesce(sum(v.importe) filter (where v.medio_pago = 'efectivo'), 0) as efectivo,
           coalesce(sum(v.importe) filter (where v.medio_pago = 'mercadopago'), 0) as mp,
           count(distinct v.ticket_id) as tickets
    from public.jornadas j
    left join public.ventas v on v.jornada_id = j.id and not v.anulada
    where j.fecha between p_desde and p_hasta
    group by j.id
  )
  select date_trunc(p_unidad, d.fecha)::date as p,
         sum(d.total), sum(d.efectivo), sum(d.mp), sum(d.tickets)::bigint, count(*)
  from por_dia d
  group by p
  order by p;
end;
$$;

-- Qué días de la semana se vende más (1 = lunes … 7 = domingo).
create function public.ventas_por_dia_semana(p_desde date, p_hasta date)
returns table (
  dia_semana int,
  dias_trabajados bigint,
  total numeric,
  promedio numeric
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.exigir_admin();

  return query
  with por_dia as (
    select j.fecha, coalesce(sum(v.importe), 0) as total
    from public.jornadas j
    left join public.ventas v on v.jornada_id = j.id and not v.anulada
    where j.fecha between p_desde and p_hasta
    group by j.id
  )
  select extract(isodow from d.fecha)::int as dia,
         count(*), sum(d.total), round(avg(d.total), 2)
  from por_dia d
  group by dia
  order by dia;
end;
$$;

-- Ventas por hora del día: promedio por día trabajado.
create function public.ventas_por_hora(p_desde date, p_hasta date)
returns table (
  hora int,
  dias_trabajados bigint,
  promedio_total numeric,
  promedio_tickets numeric
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_dias bigint;
begin
  perform public.exigir_admin();
  if p_hasta < p_desde then
    raise exception 'La fecha "hasta" no puede ser anterior a "desde".' using errcode = 'P0001';
  end if;

  select count(*) into v_dias from public.jornadas where fecha between p_desde and p_hasta;

  return query
  select h.hora,
         v_dias,
         case when v_dias > 0 then round(coalesce(sum(v.importe), 0) / v_dias, 2) else 0 end,
         case when v_dias > 0 then round(count(distinct v.ticket_id)::numeric / v_dias, 1) else 0 end
  from generate_series(0, 23) as h(hora)
  left join (
    select v.ticket_id, v.importe,
           extract(hour from v.registrada_en at time zone 'America/Argentina/Buenos_Aires')::int as hora
    from public.ventas v
    join public.jornadas j on j.id = v.jornada_id
    where j.fecha between p_desde and p_hasta and not v.anulada
  ) v on v.hora = h.hora
  group by h.hora
  order by h.hora;
end;
$$;

-- Hoy contra el mismo día de la semana pasada, hasta la misma hora.
create function public.hoy_contra_semana_pasada()
returns table (
  hoy numeric,
  semana_pasada_a_esta_hora numeric,
  semana_pasada_total numeric,
  hubo_caja_semana_pasada boolean
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_hoy date := public.hoy_ar();
  v_hora time := (now() at time zone 'America/Argentina/Buenos_Aires')::time;
begin
  perform public.exigir_admin();

  return query
  select
    coalesce((select sum(v.importe) from public.ventas v join public.jornadas j on j.id = v.jornada_id
              where j.fecha = v_hoy and not v.anulada), 0),
    coalesce((select sum(v.importe) from public.ventas v join public.jornadas j on j.id = v.jornada_id
              where j.fecha = v_hoy - 7 and not v.anulada
                and (v.registrada_en at time zone 'America/Argentina/Buenos_Aires')::time <= v_hora), 0),
    coalesce((select sum(v.importe) from public.ventas v join public.jornadas j on j.id = v.jornada_id
              where j.fecha = v_hoy - 7 and not v.anulada), 0),
    exists (select 1 from public.jornadas where fecha = v_hoy - 7);
end;
$$;

-- Ingresos vs egresos por mes.
create function public.ingresos_egresos_mensual(p_desde date, p_hasta date)
returns table (
  mes date,
  ingresos numeric,
  egresos numeric,
  ganancia numeric
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.exigir_admin();

  return query
  with meses as (
    select generate_series(date_trunc('month', p_desde), date_trunc('month', p_hasta), interval '1 month')::date as mes
  ),
  ing as (
    select date_trunc('month', j.fecha)::date as mes, sum(v.importe) as total
    from public.ventas v join public.jornadas j on j.id = v.jornada_id
    where not v.anulada and j.fecha between p_desde and p_hasta
    group by 1
  ),
  egr as (
    select date_trunc('month', e.fecha)::date as mes, sum(e.monto) as total
    from public.egresos e
    where not e.anulado and e.fecha between p_desde and p_hasta
    group by 1
  )
  select m.mes,
         coalesce(ing.total, 0),
         coalesce(egr.total, 0),
         coalesce(ing.total, 0) - coalesce(egr.total, 0)
  from meses m
  left join ing on ing.mes = m.mes
  left join egr on egr.mes = m.mes
  order by m.mes;
end;
$$;

create function public.egresos_por_categoria(p_desde date, p_hasta date)
returns table (
  categoria_id uuid,
  categoria text,
  total numeric,
  cantidad bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.exigir_admin();

  return query
  select c.id, c.nombre, sum(e.monto), count(*)
  from public.egresos e
  join public.categorias_egreso c on c.id = e.categoria_id
  where not e.anulado and e.fecha between p_desde and p_hasta
  group by c.id, c.nombre
  order by sum(e.monto) desc;
end;
$$;

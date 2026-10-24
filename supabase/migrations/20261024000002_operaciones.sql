-- =============================================================================
-- Granja Dani — operaciones de la caja
-- Todas las escrituras de jornadas, ventas y salidas pasan por estas funciones,
-- que validan las reglas de negocio. Los mensajes de error se muestran tal cual
-- en la app: están escritos para quien atiende el mostrador.
-- =============================================================================

create function public.exigir_usuario_activo()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.usuario_activo() then
    raise exception 'Tu usuario no está activo. Pedile a un administrador que lo revise.'
      using errcode = '42501';
  end if;
end;
$$;

create function public.exigir_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Esta acción es solo para administradores.' using errcode = '42501';
  end if;
end;
$$;

-- La jornada abierta de hoy, o un error claro si no la hay.
create function public.jornada_de_hoy_abierta()
returns public.jornadas
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_jornada public.jornadas;
begin
  select * into v_jornada from public.jornadas where estado = 'abierta';
  if not found then
    raise exception 'No hay un día abierto. Abrí el día para seguir.' using errcode = 'P0001';
  end if;
  if v_jornada.fecha <> public.hoy_ar() then
    raise exception 'Quedó abierto el día %. Cerralo y abrí el de hoy para seguir.',
      to_char(v_jornada.fecha, 'DD/MM') using errcode = 'P0001';
  end if;
  return v_jornada;
end;
$$;

-- -----------------------------------------------------------------------------
-- Abrir el día
-- -----------------------------------------------------------------------------
create function public.abrir_jornada(p_fondo_inicial numeric default 0)
returns public.jornadas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_abierta public.jornadas;
  v_hoy date := public.hoy_ar();
  v_nueva public.jornadas;
begin
  perform public.exigir_usuario_activo();

  if p_fondo_inicial is null or p_fondo_inicial < 0 then
    raise exception 'El fondo de caja no puede ser negativo.' using errcode = 'P0001';
  end if;

  select * into v_abierta from public.jornadas where estado = 'abierta' for update;
  if found then
    if v_abierta.fecha = v_hoy then
      raise exception 'El día de hoy ya está abierto.' using errcode = 'P0001';
    end if;
    raise exception 'Quedó abierto el día %. Cerralo antes de abrir uno nuevo.',
      to_char(v_abierta.fecha, 'DD/MM') using errcode = 'P0001';
  end if;

  if exists (select 1 from public.jornadas where fecha = v_hoy) then
    raise exception 'El día de hoy ya se cerró. Si hay que corregir algo, un administrador puede reabrirlo.'
      using errcode = 'P0001';
  end if;

  insert into public.jornadas (fecha, fondo_inicial, abierta_por)
  values (v_hoy, round(p_fondo_inicial, 2), auth.uid())
  returning * into v_nueva;

  return v_nueva;
end;
$$;

-- -----------------------------------------------------------------------------
-- Cargar un ticket: uno o más productos que el cliente paga junto, con un medio.
-- p_items: [{"producto_id": "...", "cantidad": 1.25, "importe": 8750}, ...]
-- cantidad es opcional (null si se vendió por importe sin pesar).
-- -----------------------------------------------------------------------------
create function public.registrar_ticket(p_medio_pago public.medio_pago, p_items jsonb)
returns setof public.ventas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jornada public.jornadas;
  v_ticket uuid := gen_random_uuid();
  v_item jsonb;
  v_producto public.productos;
  v_cantidad numeric;
  v_importe numeric;
  v_total numeric := 0;
begin
  perform public.exigir_usuario_activo();

  if p_medio_pago is null then
    raise exception 'Elegí si pagó en efectivo o con Mercado Pago.' using errcode = 'P0001';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Agregá al menos un producto.' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'Son demasiados productos para un solo ticket (máximo 30).' using errcode = 'P0001';
  end if;

  v_jornada := public.jornada_de_hoy_abierta();

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_producto from public.productos
    where id = nullif(v_item ->> 'producto_id', '')::uuid;
    if not found then
      raise exception 'No encontramos uno de los productos. Actualizá la página.' using errcode = 'P0001';
    end if;
    if not v_producto.activo then
      raise exception '"%" ya no se vende. Actualizá la página.', v_producto.nombre using errcode = 'P0001';
    end if;

    v_cantidad := nullif(v_item ->> 'cantidad', '')::numeric;
    v_importe := nullif(v_item ->> 'importe', '')::numeric;

    if v_cantidad is not null and (v_cantidad <= 0 or v_cantidad > 9999) then
      raise exception 'Revisá la cantidad de %.', v_producto.nombre using errcode = 'P0001';
    end if;
    if v_importe is null or v_importe <= 0 then
      raise exception 'El importe de % tiene que ser mayor a $ 0.', v_producto.nombre using errcode = 'P0001';
    end if;
    if v_importe > 9999999 then
      raise exception 'El importe de % es demasiado grande. Revisá los ceros.', v_producto.nombre
        using errcode = 'P0001';
    end if;

    v_total := v_total + v_importe;

    return query
    insert into public.ventas
      (jornada_id, ticket_id, producto_id, cantidad, precio_unitario, importe, medio_pago, registrada_por)
    values (
      v_jornada.id, v_ticket, v_producto.id, round(v_cantidad, 3), v_producto.precio,
      round(v_importe, 2), p_medio_pago, auth.uid()
    )
    returning *;
  end loop;

  if v_total > 9999999 then
    raise exception 'El total del ticket es demasiado grande. Revisá los importes.' using errcode = 'P0001';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Anular una venta (una línea) o un ticket entero.
-- El admin anula cualquiera (con la jornada abierta). Un cajero, solo las que
-- cargó su cuenta hace menos de 10 minutos.
-- -----------------------------------------------------------------------------
create function public.anular_venta(p_venta_id uuid, p_motivo text)
returns public.ventas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venta public.ventas;
  v_estado public.estado_jornada;
begin
  perform public.exigir_usuario_activo();

  if p_motivo is null or length(trim(p_motivo)) < 3 then
    raise exception 'Escribí el motivo de la anulación (al menos 3 letras).' using errcode = 'P0001';
  end if;

  select * into v_venta from public.ventas where id = p_venta_id for update;
  if not found then
    raise exception 'No encontramos esa venta.' using errcode = 'P0002';
  end if;

  select estado into v_estado from public.jornadas where id = v_venta.jornada_id;
  if v_estado = 'cerrada' then
    raise exception 'El día está cerrado: no se pueden anular ventas. Un administrador puede reabrirlo.'
      using errcode = 'P0001';
  end if;

  if v_venta.anulada then
    raise exception 'Esta venta ya estaba anulada.' using errcode = 'P0001';
  end if;

  if not public.es_admin() then
    if v_venta.registrada_por <> auth.uid() then
      raise exception 'Solo un administrador puede anular ventas cargadas por otra cuenta.'
        using errcode = '42501';
    end if;
    if v_venta.registrada_en < now() - interval '10 minutes' then
      raise exception 'Pasaron más de 10 minutos: solo un administrador puede anular esta venta.'
        using errcode = '42501';
    end if;
  end if;

  update public.ventas
  set anulada = true, anulada_por = auth.uid(), anulada_en = now(),
      motivo_anulacion = trim(p_motivo)
  where id = p_venta_id
  returning * into v_venta;

  return v_venta;
end;
$$;

create function public.anular_ticket(p_ticket_id uuid, p_motivo text)
returns setof public.ventas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_hay boolean := false;
begin
  for v_id in
    select id from public.ventas
    where ticket_id = p_ticket_id and not anulada
    order by registrada_en, id
  loop
    v_hay := true;
    return query select * from public.anular_venta(v_id, p_motivo);
  end loop;

  if not v_hay then
    raise exception 'Ese ticket no tiene ventas para anular.' using errcode = 'P0001';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Sacar efectivo (en el día abierto de hoy)
-- El pago a proveedor y el gasto del local también quedan como egreso.
-- -----------------------------------------------------------------------------
create function public.registrar_salida(
  p_importe numeric, p_motivo public.motivo_salida, p_detalle text default null
)
returns public.salidas_caja
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jornada public.jornadas;
  v_salida public.salidas_caja;
  v_detalle text := nullif(trim(p_detalle), '');
  v_categoria uuid;
begin
  perform public.exigir_usuario_activo();

  if p_importe is null or p_importe <= 0 then
    raise exception 'El importe tiene que ser mayor a $ 0.' using errcode = 'P0001';
  end if;
  if p_importe > 9999999 then
    raise exception 'El importe es demasiado grande. Revisá los ceros.' using errcode = 'P0001';
  end if;
  if p_motivo is null then
    raise exception 'Elegí para qué sacaste la plata.' using errcode = 'P0001';
  end if;
  if p_motivo = 'otro' and v_detalle is null then
    raise exception 'Contá en pocas palabras para qué fue la plata.' using errcode = 'P0001';
  end if;
  if length(v_detalle) > 120 then
    raise exception 'El detalle es muy largo (máximo 120 letras).' using errcode = 'P0001';
  end if;

  v_jornada := public.jornada_de_hoy_abierta();

  insert into public.salidas_caja (jornada_id, importe, motivo, detalle, registrada_por)
  values (v_jornada.id, round(p_importe, 2), p_motivo, v_detalle, auth.uid())
  returning * into v_salida;

  if p_motivo in ('proveedor', 'gasto') then
    select id into v_categoria from public.categorias_egreso
    where activa and lower(nombre) = case when p_motivo = 'proveedor' then 'mercadería' else 'otros' end;
    if v_categoria is null then
      select id into v_categoria from public.categorias_egreso
      where activa order by (lower(nombre) = 'otros') desc, nombre limit 1;
    end if;
    if v_categoria is null then
      raise exception 'No hay categorías de egreso activas. Pedile a un administrador que cree una.'
        using errcode = 'P0001';
    end if;

    perform set_config('granja.desde_caja', 'si', true);
    insert into public.egresos
      (fecha, categoria_id, descripcion, proveedor, monto, medio_pago, registrado_por, salida_caja_id)
    values (
      v_jornada.fecha,
      v_categoria,
      coalesce(v_detalle, case when p_motivo = 'proveedor' then 'Pago a proveedor' else 'Gasto del local' end)
        || ' (desde la caja)',
      case when p_motivo = 'proveedor' then v_detalle end,
      v_salida.importe,
      'efectivo',
      auth.uid(),
      v_salida.id
    );
    perform set_config('granja.desde_caja', '', true);
  end if;

  return v_salida;
end;
$$;

create function public.anular_salida(p_salida_id uuid, p_motivo text)
returns public.salidas_caja
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_salida public.salidas_caja;
  v_estado public.estado_jornada;
begin
  perform public.exigir_usuario_activo();

  if p_motivo is null or length(trim(p_motivo)) < 3 then
    raise exception 'Escribí el motivo de la anulación (al menos 3 letras).' using errcode = 'P0001';
  end if;

  select * into v_salida from public.salidas_caja where id = p_salida_id for update;
  if not found then
    raise exception 'No encontramos esa salida.' using errcode = 'P0002';
  end if;

  select estado into v_estado from public.jornadas where id = v_salida.jornada_id;
  if v_estado = 'cerrada' then
    raise exception 'El día está cerrado: no se pueden anular salidas. Un administrador puede reabrirlo.'
      using errcode = 'P0001';
  end if;
  if v_salida.anulada then
    raise exception 'Esta salida ya estaba anulada.' using errcode = 'P0001';
  end if;

  if not public.es_admin() then
    if v_salida.registrada_por <> auth.uid() then
      raise exception 'Solo un administrador puede anular salidas cargadas por otra cuenta.'
        using errcode = '42501';
    end if;
    if v_salida.registrada_en < now() - interval '10 minutes' then
      raise exception 'Pasaron más de 10 minutos: solo un administrador puede anular esta salida.'
        using errcode = '42501';
    end if;
  end if;

  update public.salidas_caja
  set anulada = true, anulada_por = auth.uid(), anulada_en = now(),
      motivo_anulacion = trim(p_motivo)
  where id = p_salida_id
  returning * into v_salida;

  perform set_config('granja.desde_caja', 'si', true);
  update public.egresos
  set anulado = true, motivo_anulacion = trim(p_motivo)
  where salida_caja_id = p_salida_id and not anulado;
  perform set_config('granja.desde_caja', '', true);

  return v_salida;
end;
$$;

-- -----------------------------------------------------------------------------
-- Efectivo esperado = fondo + ventas en efectivo − salidas (todo sin anular).
-- -----------------------------------------------------------------------------
create function public.efectivo_esperado(p_jornada_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select j.fondo_inicial
    + coalesce((select sum(importe) from public.ventas
                where jornada_id = j.id and not anulada and medio_pago = 'efectivo'), 0)
    - coalesce((select sum(importe) from public.salidas_caja
                where jornada_id = j.id and not anulada), 0)
  from public.jornadas j
  where j.id = p_jornada_id;
$$;

-- -----------------------------------------------------------------------------
-- Cerrar el día con arqueo
-- -----------------------------------------------------------------------------
create function public.cerrar_jornada(
  p_jornada_id uuid, p_efectivo_contado numeric, p_nota text default null
)
returns public.jornadas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jornada public.jornadas;
begin
  perform public.exigir_usuario_activo();

  if p_efectivo_contado is null or p_efectivo_contado < 0 then
    raise exception 'Escribí cuánto efectivo contaste (puede ser $ 0).' using errcode = 'P0001';
  end if;
  if p_nota is not null and length(p_nota) > 500 then
    raise exception 'La nota es muy larga (máximo 500 letras).' using errcode = 'P0001';
  end if;

  select * into v_jornada from public.jornadas where id = p_jornada_id for update;
  if not found then
    raise exception 'No encontramos ese día.' using errcode = 'P0002';
  end if;
  if v_jornada.estado = 'cerrada' then
    raise exception 'Este día ya está cerrado.' using errcode = 'P0001';
  end if;

  update public.jornadas
  set estado = 'cerrada',
      cerrada_por = auth.uid(),
      cerrada_en = now(),
      efectivo_contado = round(p_efectivo_contado, 2),
      diferencia_efectivo = round(p_efectivo_contado, 2) - public.efectivo_esperado(p_jornada_id),
      nota_cierre = nullif(trim(p_nota), '')
  where id = p_jornada_id
  returning * into v_jornada;

  return v_jornada;
end;
$$;

-- -----------------------------------------------------------------------------
-- Reabrir un día cerrado (solo admin; queda en auditoría)
-- -----------------------------------------------------------------------------
create function public.reabrir_jornada(p_jornada_id uuid)
returns public.jornadas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jornada public.jornadas;
  v_abierta date;
begin
  perform public.exigir_admin();

  select * into v_jornada from public.jornadas where id = p_jornada_id for update;
  if not found then
    raise exception 'No encontramos ese día.' using errcode = 'P0002';
  end if;
  if v_jornada.estado = 'abierta' then
    raise exception 'Este día ya está abierto.' using errcode = 'P0001';
  end if;

  select fecha into v_abierta from public.jornadas where estado = 'abierta';
  if found then
    raise exception 'Está abierto el día %. Cerralo antes de reabrir otro.',
      to_char(v_abierta, 'DD/MM') using errcode = 'P0001';
  end if;

  update public.jornadas
  set estado = 'abierta', cerrada_por = null, cerrada_en = null,
      efectivo_contado = null, diferencia_efectivo = null
  where id = p_jornada_id
  returning * into v_jornada;

  return v_jornada;
end;
$$;

-- Contraseña cambiada (después del primer ingreso con clave temporal).
create function public.marcar_clave_cambiada()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.perfiles set debe_cambiar_clave = false where id = auth.uid();
$$;

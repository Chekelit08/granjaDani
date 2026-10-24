-- =============================================================================
-- Granja Los Amigos — base del esquema
-- Perfiles y roles, configuración, productos, jornadas, ventas por producto,
-- salidas de caja, egresos y auditoría. Los permisos van con RLS; las
-- operaciones con reglas de negocio (abrir, vender, anular, cerrar, reabrir)
-- pasan por las funciones de 20261024000002.
-- =============================================================================

create type public.rol_usuario as enum ('cajero', 'admin');
-- Como en la planilla del día: EFE y MP.
create type public.medio_pago as enum ('efectivo', 'mercadopago');
create type public.estado_jornada as enum ('abierta', 'cerrada');
create type public.unidad_producto as enum ('kg', 'unidad');
create type public.motivo_salida as enum ('proveedor', 'retiro', 'gasto', 'otro');

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------

create function public.tocar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Fecha de trabajo en Buenos Aires (la base corre en UTC).
create function public.hoy_ar()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Argentina/Buenos_Aires')::date;
$$;

-- -----------------------------------------------------------------------------
-- Perfiles: extiende auth.users
-- -----------------------------------------------------------------------------

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete restrict,
  nombre text not null check (length(trim(nombre)) between 1 and 80),
  email text,
  rol public.rol_usuario not null default 'cajero',
  activo boolean not null default true,
  debe_cambiar_clave boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger perfiles_updated_at before update on public.perfiles
  for each row execute function public.tocar_updated_at();

-- El perfil nace con el usuario. El rol viene de app_metadata, que solo escribe el servidor.
-- Si alguien se registrara solo (registro público prendido por error), queda INACTIVO.
create function public.crear_perfil_de_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre, email, rol, activo, debe_cambiar_clave)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_app_meta_data ->> 'rol')::public.rol_usuario, 'cajero'),
    (new.raw_app_meta_data ->> 'rol') is not null,
    coalesce((new.raw_app_meta_data ->> 'debe_cambiar_clave')::boolean, false)
  );
  return new;
end;
$$;

create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil_de_usuario();

-- Auth crea el usuario y DESPUÉS escribe app_metadata: cuando el servidor cambia el rol
-- o la marca de clave temporal, se copia al perfil. El alta hecha por el servidor activa la cuenta.
create function public.sincronizar_perfil_de_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.raw_app_meta_data ->> 'rol') is distinct from (old.raw_app_meta_data ->> 'rol')
    or (new.raw_app_meta_data ->> 'debe_cambiar_clave') is distinct from (old.raw_app_meta_data ->> 'debe_cambiar_clave') then
    perform set_config('granja.sincronizando', 'si', true);
    update public.perfiles
    set rol = coalesce((new.raw_app_meta_data ->> 'rol')::public.rol_usuario, rol),
        debe_cambiar_clave = coalesce((new.raw_app_meta_data ->> 'debe_cambiar_clave')::boolean, debe_cambiar_clave),
        activo = case
          when (old.raw_app_meta_data ->> 'rol') is null and (new.raw_app_meta_data ->> 'rol') is not null then true
          else activo
        end
    where id = new.id;
    perform set_config('granja.sincronizando', '', true);
  end if;
  return new;
end;
$$;

create trigger al_actualizar_usuario after update of raw_app_meta_data on auth.users
  for each row execute function public.sincronizar_perfil_de_usuario();

-- Desde la app, un admin cambia nombre, rol y si está activo. El resto lo maneja el servidor.
create function public.proteger_campos_perfil()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and current_user = 'authenticated' then
    new.id := old.id;
    new.email := old.email;
    if new.debe_cambiar_clave and not old.debe_cambiar_clave then
      new.debe_cambiar_clave := old.debe_cambiar_clave;
    end if;
  end if;
  return new;
end;
$$;

create trigger perfiles_proteger_campos before update on public.perfiles
  for each row execute function public.proteger_campos_perfil();

-- Siempre tiene que quedar al menos un admin activo.
create function public.proteger_ultimo_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.rol = 'admin' and old.activo and (new.rol <> 'admin' or not new.activo) then
    if not exists (
      select 1 from public.perfiles where rol = 'admin' and activo and id <> old.id
    ) then
      raise exception 'Tiene que quedar al menos un administrador activo.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger perfiles_ultimo_admin before update on public.perfiles
  for each row execute function public.proteger_ultimo_admin();

-- Helpers de permisos. security definer para que no dependan del RLS de perfiles.
create function public.usuario_activo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and activo);
$$;

create function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and activo and rol = 'admin');
$$;

-- -----------------------------------------------------------------------------
-- Configuración (una sola fila)
-- -----------------------------------------------------------------------------

create table public.configuracion (
  id uuid primary key default gen_random_uuid(),
  unica boolean not null default true unique check (unica),
  tope_confirmacion numeric(12, 2) not null default 300000 check (tope_confirmacion > 0),
  -- Número al que va el resumen del cierre (solo dígitos, con código de país: 5491122334455).
  whatsapp_dueno text check (whatsapp_dueno ~ '^[0-9]{8,15}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger configuracion_updated_at before update on public.configuracion
  for each row execute function public.tocar_updated_at();

insert into public.configuracion default values;

-- -----------------------------------------------------------------------------
-- Productos: las columnas de la planilla del día
-- -----------------------------------------------------------------------------

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) between 2 and 40),
  unidad public.unidad_producto not null default 'kg',
  -- Precio por kilo (o por unidad). Opcional: si está, la caja calcula el importe sola.
  precio numeric(12, 2) check (precio > 0 and precio <= 9999999),
  orden int not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index productos_nombre on public.productos (lower(trim(nombre)));
create index productos_orden on public.productos (orden, nombre);

create trigger productos_updated_at before update on public.productos
  for each row execute function public.tocar_updated_at();

-- Los de la planilla, en el mismo orden.
insert into public.productos (nombre, unidad, orden) values
  ('Milanesa', 'kg', 10),
  ('Pata y muslo', 'kg', 20),
  ('Alitas', 'kg', 30),
  ('Pechuga', 'kg', 40),
  ('Trozado', 'kg', 50),
  ('Congelado', 'kg', 60),
  ('Huevo', 'unidad', 70),
  ('Pollo', 'kg', 80),
  ('Papa', 'kg', 90),
  ('Cebolla', 'kg', 100),
  ('Pan rallado', 'kg', 110),
  ('B. horno y condimento', 'kg', 120),
  ('Menudo', 'kg', 130);

-- -----------------------------------------------------------------------------
-- Jornadas: un día de trabajo
-- -----------------------------------------------------------------------------

create table public.jornadas (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  estado public.estado_jornada not null default 'abierta',
  fondo_inicial numeric(12, 2) not null default 0 check (fondo_inicial >= 0),
  abierta_por uuid not null references public.perfiles (id),
  abierta_en timestamptz not null default now(),
  cerrada_por uuid references public.perfiles (id),
  cerrada_en timestamptz,
  efectivo_contado numeric(12, 2) check (efectivo_contado >= 0),
  diferencia_efectivo numeric(12, 2),
  nota_cierre text check (length(nota_cierre) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jornada_cierre_completo check (
    (estado = 'abierta' and cerrada_por is null and cerrada_en is null
      and efectivo_contado is null and diferencia_efectivo is null)
    or
    (estado = 'cerrada' and cerrada_por is not null and cerrada_en is not null
      and efectivo_contado is not null and diferencia_efectivo is not null)
  )
);

-- Regla 1: una sola jornada abierta a la vez.
create unique index jornadas_una_abierta on public.jornadas ((true)) where estado = 'abierta';
create index jornadas_estado on public.jornadas (estado);

create trigger jornadas_updated_at before update on public.jornadas
  for each row execute function public.tocar_updated_at();

-- -----------------------------------------------------------------------------
-- Ventas: una fila por producto. Las de un mismo cliente comparten ticket_id.
-- No se borran, se anulan.
-- -----------------------------------------------------------------------------

create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  jornada_id uuid not null references public.jornadas (id) on delete restrict,
  ticket_id uuid not null,
  producto_id uuid not null references public.productos (id) on delete restrict,
  -- Kilos (o unidades). Opcional: si se vendió "$ 5.000 de papa" sin pesar, queda vacío.
  cantidad numeric(10, 3) check (cantidad > 0 and cantidad <= 9999),
  -- Precio que tenía el producto al momento de la venta, si lo tenía.
  precio_unitario numeric(12, 2) check (precio_unitario > 0),
  importe numeric(12, 2) not null check (importe > 0 and importe <= 9999999),
  medio_pago public.medio_pago not null,
  registrada_por uuid not null references public.perfiles (id),
  registrada_en timestamptz not null default now(),
  anulada boolean not null default false,
  anulada_por uuid references public.perfiles (id),
  anulada_en timestamptz,
  motivo_anulacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venta_anulacion_completa check (
    (not anulada and anulada_por is null and anulada_en is null and motivo_anulacion is null)
    or
    (anulada and anulada_por is not null and anulada_en is not null
      and motivo_anulacion is not null and length(trim(motivo_anulacion)) between 3 and 200)
  )
);

create index ventas_jornada on public.ventas (jornada_id);
create index ventas_ticket on public.ventas (ticket_id);
create index ventas_producto on public.ventas (producto_id);
create index ventas_registrada_en on public.ventas (registrada_en);

create trigger ventas_updated_at before update on public.ventas
  for each row execute function public.tocar_updated_at();

-- Nada se carga ni se modifica en una jornada cerrada. Las ventas no se borran ni se editan.
create function public.proteger_ventas()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_estado public.estado_jornada;
begin
  if tg_op = 'DELETE' then
    raise exception 'Las ventas no se borran: se anulan con un motivo.' using errcode = 'P0001';
  end if;

  select estado into v_estado from public.jornadas where id = new.jornada_id;
  if v_estado = 'cerrada' then
    raise exception 'El día está cerrado: no se pueden cargar ni modificar ventas. Un administrador puede reabrirlo.'
      using errcode = 'P0001';
  end if;

  if tg_op = 'UPDATE' then
    -- Lo único que cambia de una venta es su anulación, y no tiene vuelta atrás.
    if new.jornada_id <> old.jornada_id or new.ticket_id <> old.ticket_id
      or new.producto_id <> old.producto_id or new.cantidad is distinct from old.cantidad
      or new.precio_unitario is distinct from old.precio_unitario or new.importe <> old.importe
      or new.medio_pago <> old.medio_pago or new.registrada_por <> old.registrada_por
      or new.registrada_en <> old.registrada_en then
      raise exception 'Una venta no se edita: anulala y cargala de nuevo.' using errcode = 'P0001';
    end if;
    if old.anulada then
      raise exception 'Esta venta ya estaba anulada.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger ventas_proteger before insert or update or delete on public.ventas
  for each row execute function public.proteger_ventas();

-- -----------------------------------------------------------------------------
-- Salidas de efectivo de la caja (pago a proveedor, retiro, gasto)
-- -----------------------------------------------------------------------------

create table public.salidas_caja (
  id uuid primary key default gen_random_uuid(),
  jornada_id uuid not null references public.jornadas (id) on delete restrict,
  importe numeric(12, 2) not null check (importe > 0 and importe <= 9999999),
  motivo public.motivo_salida not null,
  detalle text check (length(detalle) <= 120),
  registrada_por uuid not null references public.perfiles (id),
  registrada_en timestamptz not null default now(),
  anulada boolean not null default false,
  anulada_por uuid references public.perfiles (id),
  anulada_en timestamptz,
  motivo_anulacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salida_anulacion_completa check (
    (not anulada and anulada_por is null and anulada_en is null and motivo_anulacion is null)
    or
    (anulada and anulada_por is not null and anulada_en is not null
      and motivo_anulacion is not null and length(trim(motivo_anulacion)) between 3 and 200)
  )
);

create index salidas_caja_jornada on public.salidas_caja (jornada_id);

create trigger salidas_caja_updated_at before update on public.salidas_caja
  for each row execute function public.tocar_updated_at();

create function public.proteger_salidas()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_estado public.estado_jornada;
begin
  if tg_op = 'DELETE' then
    raise exception 'Las salidas de caja no se borran: se anulan con un motivo.' using errcode = 'P0001';
  end if;

  select estado into v_estado from public.jornadas where id = new.jornada_id;
  if v_estado = 'cerrada' then
    raise exception 'El día está cerrado: no se pueden cargar ni modificar salidas. Un administrador puede reabrirlo.'
      using errcode = 'P0001';
  end if;

  if tg_op = 'UPDATE' then
    if new.jornada_id <> old.jornada_id or new.importe <> old.importe or new.motivo <> old.motivo
      or new.detalle is distinct from old.detalle or new.registrada_por <> old.registrada_por
      or new.registrada_en <> old.registrada_en then
      raise exception 'Una salida no se edita: anulala y cargala de nuevo.' using errcode = 'P0001';
    end if;
    if old.anulada then
      raise exception 'Esta salida ya estaba anulada.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger salidas_caja_proteger before insert or update or delete on public.salidas_caja
  for each row execute function public.proteger_salidas();

-- -----------------------------------------------------------------------------
-- Egresos (solo admin)
-- -----------------------------------------------------------------------------

create table public.categorias_egreso (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) between 2 and 40),
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index categorias_egreso_nombre on public.categorias_egreso (lower(trim(nombre)));

create trigger categorias_egreso_updated_at before update on public.categorias_egreso
  for each row execute function public.tocar_updated_at();

insert into public.categorias_egreso (nombre) values
  ('Mercadería'), ('Alquiler'), ('Servicios'), ('Sueldos'), ('Impuestos'), ('Mantenimiento'), ('Otros');

create table public.egresos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  categoria_id uuid not null references public.categorias_egreso (id) on delete restrict,
  descripcion text not null check (length(trim(descripcion)) between 2 and 200),
  proveedor text check (length(proveedor) <= 80),
  monto numeric(12, 2) not null check (monto > 0 and monto <= 999999999),
  medio_pago public.medio_pago not null,
  -- Si se pagó con la plata de la caja, la salida que lo originó (se anula desde la caja).
  salida_caja_id uuid unique references public.salidas_caja (id) on delete restrict,
  registrado_por uuid not null references public.perfiles (id) default auth.uid(),
  anulado boolean not null default false,
  anulado_por uuid references public.perfiles (id),
  anulado_en timestamptz,
  motivo_anulacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint egreso_anulacion_completa check (
    (not anulado and anulado_por is null and anulado_en is null and motivo_anulacion is null)
    or
    (anulado and anulado_por is not null and anulado_en is not null
      and motivo_anulacion is not null and length(trim(motivo_anulacion)) between 3 and 200)
  )
);

create index egresos_fecha on public.egresos (fecha);
create index egresos_categoria on public.egresos (categoria_id);

create trigger egresos_updated_at before update on public.egresos
  for each row execute function public.tocar_updated_at();

-- Los egresos no se borran ni se des-anulan; quién los cargó no cambia.
create function public.proteger_egresos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Los egresos no se borran: se anulan con un motivo.' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' then
    new.registrado_por := coalesce(auth.uid(), new.registrado_por);
    new.anulado := false;
    new.anulado_por := null;
    new.anulado_en := null;
    new.motivo_anulacion := null;
    if new.salida_caja_id is not null
      and coalesce(current_setting('granja.desde_caja', true), '') <> 'si' then
      new.salida_caja_id := null;
    end if;
    return new;
  end if;
  if old.salida_caja_id is not null
    and coalesce(current_setting('granja.desde_caja', true), '') <> 'si' then
    raise exception 'Este gasto se pagó con la plata de la caja: anulá la salida desde la caja de ese día.'
      using errcode = 'P0001';
  end if;
  new.salida_caja_id := old.salida_caja_id;
  if old.anulado then
    raise exception 'Este egreso está anulado y ya no se modifica.' using errcode = 'P0001';
  end if;
  new.registrado_por := old.registrado_por;
  if new.anulado then
    new.anulado_por := coalesce(auth.uid(), new.anulado_por);
    new.anulado_en := now();
  end if;
  return new;
end;
$$;

create trigger egresos_proteger before insert or update or delete on public.egresos
  for each row execute function public.proteger_egresos();

-- -----------------------------------------------------------------------------
-- Auditoría: solo se agrega, nunca se edita ni se borra.
-- -----------------------------------------------------------------------------

create table public.auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.perfiles (id),
  usuario_nombre text,
  accion text not null,
  tabla text not null,
  registro_id uuid,
  antes jsonb,
  despues jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index auditoria_created_at on public.auditoria (created_at desc);
create index auditoria_registro on public.auditoria (tabla, registro_id);

create function public.auditoria_inmutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'La auditoría no se modifica ni se borra.' using errcode = 'P0001';
end;
$$;

create trigger auditoria_sin_cambios before update or delete on public.auditoria
  for each row execute function public.auditoria_inmutable();

create function public.registrar_auditoria(
  p_accion text, p_tabla text, p_registro uuid, p_antes jsonb, p_despues jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.auditoria (usuario_id, usuario_nombre, accion, tabla, registro_id, antes, despues)
  values (
    auth.uid(),
    (select nombre from public.perfiles where id = auth.uid()),
    p_accion, p_tabla, p_registro, p_antes, p_despues
  );
end;
$$;

-- La Edge Function `usuarios` corre con la clave de servicio (sin auth.uid()): registra a nombre del admin.
create function public.registrar_auditoria_servicio(
  p_actor uuid, p_accion text, p_registro uuid, p_despues jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.auditoria (usuario_id, usuario_nombre, accion, tabla, registro_id, antes, despues)
  values (
    p_actor,
    (select nombre from public.perfiles where id = p_actor),
    p_accion, 'perfiles', p_registro, null, p_despues
  );
end;
$$;

create function public.auditar_ventas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.anulada and not old.anulada then
    perform public.registrar_auditoria('anular_venta', 'ventas', new.id, to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end;
$$;

create trigger ventas_auditar after update on public.ventas
  for each row execute function public.auditar_ventas();

create function public.auditar_salidas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.registrar_auditoria('sacar_efectivo', 'salidas_caja', new.id, null, to_jsonb(new));
  elsif new.anulada and not old.anulada then
    perform public.registrar_auditoria('anular_salida', 'salidas_caja', new.id, to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end;
$$;

create trigger salidas_caja_auditar after insert or update on public.salidas_caja
  for each row execute function public.auditar_salidas();

create function public.auditar_jornadas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.estado = 'cerrada' and new.estado = 'abierta' then
    perform public.registrar_auditoria('reabrir_jornada', 'jornadas', new.id, to_jsonb(old), to_jsonb(new));
  elsif old.estado = 'abierta' and new.estado = 'cerrada' then
    perform public.registrar_auditoria('cerrar_jornada', 'jornadas', new.id, to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end;
$$;

create trigger jornadas_auditar after update on public.jornadas
  for each row execute function public.auditar_jornadas();

create function public.auditar_perfiles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- La sincronización de un alta no es un "cambio de rol" (el alta ya queda registrada).
  if current_setting('granja.sincronizando', true) = 'si' then
    return new;
  end if;
  if new.rol <> old.rol then
    perform public.registrar_auditoria('cambiar_rol', 'perfiles', new.id, to_jsonb(old), to_jsonb(new));
  end if;
  if old.activo and not new.activo then
    perform public.registrar_auditoria('desactivar_usuario', 'perfiles', new.id, to_jsonb(old), to_jsonb(new));
  elsif not old.activo and new.activo then
    perform public.registrar_auditoria('reactivar_usuario', 'perfiles', new.id, to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end;
$$;

create trigger perfiles_auditar after update on public.perfiles
  for each row execute function public.auditar_perfiles();

create function public.auditar_egresos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.anulado and not old.anulado then
    perform public.registrar_auditoria('anular_egreso', 'egresos', new.id, to_jsonb(old), to_jsonb(new));
  else
    perform public.registrar_auditoria('editar_egreso', 'egresos', new.id, to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end;
$$;

create trigger egresos_auditar after update on public.egresos
  for each row execute function public.auditar_egresos();

-- Cambios de precio, nombre o estado de un producto.
create function public.auditar_productos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.registrar_auditoria('crear_producto', 'productos', new.id, null, to_jsonb(new));
  elsif new.precio is distinct from old.precio then
    perform public.registrar_auditoria('cambiar_precio', 'productos', new.id, to_jsonb(old), to_jsonb(new));
  elsif (new.nombre, new.unidad, new.activo) is distinct from (old.nombre, old.unidad, old.activo) then
    perform public.registrar_auditoria('editar_producto', 'productos', new.id, to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end;
$$;

create trigger productos_auditar after insert or update on public.productos
  for each row execute function public.auditar_productos();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.perfiles enable row level security;
alter table public.configuracion enable row level security;
alter table public.productos enable row level security;
alter table public.jornadas enable row level security;
alter table public.ventas enable row level security;
alter table public.salidas_caja enable row level security;
alter table public.categorias_egreso enable row level security;
alter table public.egresos enable row level security;
alter table public.auditoria enable row level security;

-- Perfiles: cada uno ve el suyo; el admin ve y edita todos.
create policy perfiles_ver_propio on public.perfiles for select to authenticated
  using (id = (select auth.uid()));
create policy perfiles_ver_admin on public.perfiles for select to authenticated
  using (public.es_admin());
create policy perfiles_editar_admin on public.perfiles for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Configuración: la leen todos los usuarios activos, la cambia el admin.
create policy configuracion_ver on public.configuracion for select to authenticated
  using (public.usuario_activo());
create policy configuracion_editar on public.configuracion for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Productos: los ven todos (la caja los necesita); los crea y edita el admin. No se borran.
create policy productos_ver on public.productos for select to authenticated
  using (public.usuario_activo());
create policy productos_crear on public.productos for insert to authenticated
  with check (public.es_admin());
create policy productos_editar on public.productos for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Jornadas: el cajero ve solo la abierta y la de hoy. El admin, todas.
create policy jornadas_ver_cajero on public.jornadas for select to authenticated
  using (public.usuario_activo() and (estado = 'abierta' or fecha = public.hoy_ar()));
create policy jornadas_ver_admin on public.jornadas for select to authenticated
  using (public.es_admin());

-- Ventas y salidas: el cajero ve las del día abierto. El admin, todas.
-- Cargar y anular van por funciones; no hay insert/update/delete directos.
create policy ventas_ver_cajero on public.ventas for select to authenticated
  using (
    public.usuario_activo()
    and exists (select 1 from public.jornadas j where j.id = jornada_id and j.estado = 'abierta')
  );
create policy ventas_ver_admin on public.ventas for select to authenticated
  using (public.es_admin());

create policy salidas_ver_cajero on public.salidas_caja for select to authenticated
  using (
    public.usuario_activo()
    and exists (select 1 from public.jornadas j where j.id = jornada_id and j.estado = 'abierta')
  );
create policy salidas_ver_admin on public.salidas_caja for select to authenticated
  using (public.es_admin());

-- Egresos: solo admin.
create policy categorias_admin_ver on public.categorias_egreso for select to authenticated
  using (public.es_admin());
create policy categorias_admin_crear on public.categorias_egreso for insert to authenticated
  with check (public.es_admin());
create policy categorias_admin_editar on public.categorias_egreso for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy egresos_admin_ver on public.egresos for select to authenticated
  using (public.es_admin());
create policy egresos_admin_crear on public.egresos for insert to authenticated
  with check (public.es_admin());
create policy egresos_admin_editar on public.egresos for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Auditoría: solo el admin la lee.
create policy auditoria_ver_admin on public.auditoria for select to authenticated
  using (public.es_admin());

-- Los usuarios anónimos no ven nada.
revoke all on all tables in schema public from anon;

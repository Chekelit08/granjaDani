-- El alta de usuarios desde el servidor deja el perfil con el rol correcto.
begin;
select plan(5);

-- Así crea Auth un usuario: primero el insert, después escribe app_metadata.
insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
        'nueva@granja.test', '{"provider": "email"}', '{"nombre": "Nueva"}', now(), now());
select is(
  (select rol::text || '|' || activo::text from public.perfiles where email = 'nueva@granja.test'),
  'cajero|false', 'al insertar sin rol del servidor queda cajero e inactivo'
);

update auth.users set raw_app_meta_data = raw_app_meta_data || '{"rol": "admin", "debe_cambiar_clave": true}'
where id = 'c0000000-0000-4000-8000-000000000001';
select is(
  (select rol::text || '|' || debe_cambiar_clave::text from public.perfiles where email = 'nueva@granja.test'),
  'admin|true', 'el rol y la clave temporal del servidor llegan al perfil'
);
select ok((select activo from public.perfiles where email = 'nueva@granja.test'), 'el alta del servidor activa la cuenta');
select is(
  (select count(*)::int from public.auditoria where registro_id = 'c0000000-0000-4000-8000-000000000001'),
  0, 'la sincronización del alta no ensucia la auditoría'
);

-- Alguien que se registra solo (sin rol del servidor) no puede hacer nada.
insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
        'intruso@granja.test', '{"provider": "email"}', '{"nombre": "Intruso"}', now(), now());
set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok($$select public.abrir_jornada(0)$$, '42501', null, 'un auto-registro no puede abrir el día ni cargar ventas');
reset role;

select * from finish();
rollback;

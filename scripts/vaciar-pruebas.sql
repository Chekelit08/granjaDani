-- =============================================================================
-- Granja Dani — Vaciar las cargas de prueba de la base real (una sola vez)
-- Pegalo entero en Supabase → SQL Editor y apretá Run.
--
-- Borra: días, ventas, salidas de caja, egresos y la auditoría.
-- Deja:  los usuarios, la configuración, las categorías y los productos con sus precios.
--
-- Es una sola transacción: si algo falla, no se borra nada y las protecciones
-- quedan como estaban.
-- =============================================================================
begin;

alter table public.ventas disable trigger ventas_proteger;
alter table public.salidas_caja disable trigger salidas_caja_proteger;
alter table public.egresos disable trigger egresos_proteger;
alter table public.auditoria disable trigger auditoria_sin_cambios;

delete from public.egresos;
delete from public.salidas_caja;
delete from public.ventas;
delete from public.jornadas;
delete from public.auditoria;

alter table public.ventas enable trigger ventas_proteger;
alter table public.salidas_caja enable trigger salidas_caja_proteger;
alter table public.egresos enable trigger egresos_proteger;
alter table public.auditoria enable trigger auditoria_sin_cambios;

commit;

-- Para revisar: días, ventas, salidas, egresos y auditoría en 0.
select
  (select count(*) from public.jornadas) as dias,
  (select count(*) from public.ventas) as ventas,
  (select count(*) from public.salidas_caja) as salidas,
  (select count(*) from public.egresos) as egresos,
  (select count(*) from public.auditoria) as auditoria,
  (select count(*) from public.perfiles) as usuarios,
  (select count(*) from public.productos) as productos,
  (select count(*) from public.categorias_egreso) as categorias;

-- =============================================================================
-- Granja Dani — permisos de ejecución
-- Nada para anónimos. Las funciones de trigger y las internas no se pueden
-- llamar por la API; quedan expuestas solo las operaciones de la app (que
-- validan rol y reglas por dentro) y los helpers que usan las políticas RLS.
-- =============================================================================

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.usuario_activo(),
  public.es_admin(),
  public.hoy_ar(),
  public.abrir_jornada(numeric),
  public.registrar_ticket(public.medio_pago, jsonb),
  public.anular_venta(uuid, text),
  public.anular_ticket(uuid, text),
  public.registrar_salida(numeric, public.motivo_salida, text),
  public.anular_salida(uuid, text),
  public.cerrar_jornada(uuid, numeric, text),
  public.reabrir_jornada(uuid),
  public.marcar_clave_cambiada(),
  public.resumen_jornada(uuid),
  public.planilla_jornada(uuid),
  public.planilla_periodo(date, date),
  public.resumen_periodo(date, date),
  public.facturacion_por_dia(date, date),
  public.facturacion_agrupada(date, date, text),
  public.ventas_por_dia_semana(date, date),
  public.ventas_por_hora(date, date),
  public.hoy_contra_semana_pasada(),
  public.ingresos_egresos_mensual(date, date),
  public.egresos_por_categoria(date, date)
to authenticated;

-- Las funciones internas que llaman los reportes con security invoker.
grant execute on function public.exigir_admin(), public.exigir_usuario_activo() to authenticated;

grant execute on function public.registrar_auditoria_servicio(uuid, text, uuid, jsonb) to service_role;

-- Las tablas y funciones que se creen después tampoco quedan abiertas a anónimos.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from public, anon;

# Backups

El plan gratuito de Supabase **no garantiza** backups que puedas descargar. Hacé uno vos.

## Cada semana (o antes de cualquier cambio grande)

1. Tené el archivo `.env.servidor` con la URL y la _service_role key_ (ver [`DESPLIEGUE.md`](DESPLIEGUE.md)). Nunca lo subas a git ni lo mandes por WhatsApp.
2. Corré:

   ```bash
   node scripts/backup.mjs
   ```

3. Se crea `backups/AAAA-MM-DD_HHMM/` con cada tabla en dos formatos:
   - `.json`: completo, para restaurar.
   - `.csv`: se abre con Excel (los acentos salen bien).
4. Copiá esa carpeta a **dos lugares**: un pendrive y una nube personal (Google Drive, por ejemplo). Tiene datos reales del negocio: no la compartas.

`backups/` está en `.gitignore`: nunca se sube al repositorio.

## Copia completa de la base (opcional, más técnica)

```bash
npx supabase db dump --linked -f backups/esquema.sql
npx supabase db dump --linked --data-only -f backups/datos.sql
```

Con eso se puede recrear todo en otro proyecto de Supabase (`psql` contra la nueva base, primero el esquema y después los datos).

## Restaurar desde los JSON

Con un proyecto nuevo con las migraciones aplicadas (`npx supabase db push`), los JSON se pueden insertar por la API REST con la clave de servicio, tabla por tabla y en este orden: `perfiles` (después de recrear los usuarios en Auth con el mismo id), `configuracion`, `jornadas`, `ventas`, `categorias_egreso`, `egresos`, `empleados`, `pagos_empleados`, `auditoria`. Si llega a hacer falta, pedile ayuda a Ezequiel: es raro y conviene hacerlo con calma.

## Proyecto pausado

Si el proyecto queda una semana sin uso (por ejemplo, en vacaciones), Supabase lo **pausa**. Los datos no se pierden: se reactiva desde el panel de Supabase con **Restore project**. Hacé un backup antes de irte.

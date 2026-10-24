import { execFileSync } from 'node:child_process'

/**
 * Deja la base local lista para el flujo: sin jornada de hoy ni abiertas.
 * Requiere `npx supabase start` + `npx supabase db reset` (usuarios y datos de prueba del seed).
 */
const URL_DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

/** Corre SQL en la base local de pruebas. */
export function sql(consulta: string) {
  execFileSync('psql', [URL_DB, '-q', '-v', 'ON_ERROR_STOP=1', '-c', consulta], {
    stdio: 'inherit',
  })
}

export default function preparar() {
  const url = URL_DB
  const sql = `
    set session_replication_role = replica;
    delete from public.egresos where salida_caja_id in (select s.id from public.salidas_caja s join public.jornadas j on j.id = s.jornada_id where j.fecha >= public.hoy_ar() or j.estado = 'abierta');
    delete from public.salidas_caja where jornada_id in (select id from public.jornadas where fecha >= public.hoy_ar() or estado = 'abierta');
    delete from public.ventas where jornada_id in (select id from public.jornadas where fecha >= public.hoy_ar() or estado = 'abierta');
    delete from public.jornadas where fecha >= public.hoy_ar() or estado = 'abierta';
    -- Precios del seed (el test de admin cambia el de la cebolla).
    update public.productos set precio = 1100 where nombre = 'Cebolla';
    set session_replication_role = origin;
    -- Una cuenta con clave temporal, para probar el primer ingreso.
    delete from public.perfiles where email = 'temporal@usuarios.granja-dani.app';
    delete from auth.identities where user_id in (select id from auth.users where email = 'temporal@usuarios.granja-dani.app');
    delete from auth.users where email = 'temporal@usuarios.granja-dani.app';
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      'temporal@usuarios.granja-dani.app', extensions.crypt('pollo-asado-1234', extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"], "rol": "cajero", "debe_cambiar_clave": true}',
      '{"nombre": "Lucía"}', now(), now(), '', '', '', '');
    update public.perfiles set debe_cambiar_clave = true where email = 'temporal@usuarios.granja-dani.app';
  `
  execFileSync('psql', [url, '-q', '-v', 'ON_ERROR_STOP=1', '-c', sql], { stdio: 'inherit' })
}

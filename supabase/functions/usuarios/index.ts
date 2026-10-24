// Edge Function: gestión de usuarios (solo admins).
// Usa la clave de servicio, que Supabase inyecta en el servidor: nunca llega al navegador.
// Sin dependencias: habla directo con las APIs de Auth y REST de Supabase.
//
// Acciones (POST JSON):
//   { accion: 'crear', email, nombre, rol, clave }         → crea la cuenta con clave temporal
//   { accion: 'restablecer_clave', usuario_id, clave }     → pone una clave temporal nueva
//   { accion: 'bloquear', usuario_id, bloqueado }          → impide (o permite) iniciar sesión

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function respuesta(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

const error = (mensaje: string, estado = 400) => respuesta({ error: mensaje }, estado)

const URL_BASE = Deno.env.get('SUPABASE_URL') ?? ''
const CLAVE_SERVICIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

async function llamar(ruta: string, opciones: RequestInit = {}) {
  const res = await fetch(`${URL_BASE}${ruta}`, {
    ...opciones,
    headers: {
      apikey: CLAVE_SERVICIO,
      Authorization: `Bearer ${CLAVE_SERVICIO}`,
      'Content-Type': 'application/json',
      ...(opciones.headers ?? {}),
    },
  })
  const texto = await res.text()
  const json = texto ? JSON.parse(texto) : null
  return { ok: res.ok, estado: res.status, json }
}

function mensajeAuth(json: unknown): string {
  const j = (json ?? {}) as { msg?: string; message?: string; error_description?: string }
  return j.msg ?? j.message ?? j.error_description ?? 'No se pudo completar la acción.'
}

async function auditar(actor: string, accion: string, registro: string, despues: unknown) {
  await llamar('/rest/v1/rpc/registrar_auditoria_servicio', {
    method: 'POST',
    body: JSON.stringify({
      p_actor: actor,
      p_accion: accion,
      p_registro: registro,
      p_despues: despues,
    }),
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return error('Método no permitido', 405)
  if (!URL_BASE || !CLAVE_SERVICIO) return error('La función no está configurada.', 500)

  // ¿Quién llama? Tiene que ser un admin activo.
  const autorizacion = req.headers.get('Authorization') ?? ''
  if (!/^Bearer\s+\S+/i.test(autorizacion)) return error('Iniciá sesión de nuevo.', 401)
  const quien = await llamar('/auth/v1/user', { headers: { Authorization: autorizacion } })
  const quienId = (quien.json as { id?: string } | null)?.id
  if (!quien.ok || !quienId) return error('Iniciá sesión de nuevo.', 401)

  const perfil = await llamar(`/rest/v1/perfiles?id=eq.${quienId}&select=rol,activo`)
  const fila = (perfil.json as { rol: string; activo: boolean }[] | null)?.[0]
  if (!fila || fila.rol !== 'admin' || !fila.activo) {
    return error('Esta acción es solo para administradores.', 403)
  }

  let cuerpo: Record<string, unknown>
  try {
    cuerpo = await req.json()
  } catch {
    return error('Pedido inválido.')
  }

  const clave = typeof cuerpo.clave === 'string' ? cuerpo.clave : ''
  // Por defecto la persona elige una contraseña propia la primera vez que entra.
  const pedirCambio = cuerpo.pedir_cambio !== false
  const usuarioId = typeof cuerpo.usuario_id === 'string' ? cuerpo.usuario_id : ''
  if (usuarioId && !/^[0-9a-f-]{36}$/i.test(usuarioId)) return error('Usuario inválido.')

  switch (cuerpo.accion) {
    case 'crear': {
      const email = typeof cuerpo.email === 'string' ? cuerpo.email.trim().toLowerCase() : ''
      const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim() : ''
      const rol = cuerpo.rol === 'admin' ? 'admin' : 'cajero'
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return error('Escribí un email válido.')
      if (nombre.length < 1 || nombre.length > 80) return error('Escribí el nombre.')
      if (clave.length < 10) return error('La contraseña tiene que tener al menos 10 caracteres.')

      const creado = await llamar('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: clave,
          email_confirm: true,
          user_metadata: { nombre },
          app_metadata: { rol, debe_cambiar_clave: pedirCambio },
        }),
      })
      if (!creado.ok) {
        const m = mensajeAuth(creado.json)
        return error(/already|registered|exists/i.test(m) ? 'Ya hay una cuenta con ese email.' : m)
      }
      const id = (creado.json as { id: string }).id
      await auditar(quienId, 'crear_usuario', id, { email, nombre, rol })
      return respuesta({ id })
    }

    case 'restablecer_clave': {
      if (!usuarioId) return error('Falta el usuario.')
      if (clave.length < 10) return error('La contraseña tiene que tener al menos 10 caracteres.')
      const r = await llamar(`/auth/v1/admin/users/${usuarioId}`, {
        method: 'PUT',
        body: JSON.stringify({ password: clave }),
      })
      if (!r.ok) return error(mensajeAuth(r.json))
      await llamar(`/rest/v1/perfiles?id=eq.${usuarioId}`, {
        method: 'PATCH',
        body: JSON.stringify({ debe_cambiar_clave: pedirCambio }),
      })
      await auditar(quienId, 'restablecer_clave', usuarioId, null)
      return respuesta({ ok: true })
    }

    case 'bloquear': {
      if (!usuarioId) return error('Falta el usuario.')
      if (usuarioId === quienId) return error('No podés bloquear tu propia cuenta.')
      const bloqueado = cuerpo.bloqueado === true
      const r = await llamar(`/auth/v1/admin/users/${usuarioId}`, {
        method: 'PUT',
        body: JSON.stringify({ ban_duration: bloqueado ? '876000h' : 'none' }),
      })
      if (!r.ok) return error(mensajeAuth(r.json))
      return respuesta({ ok: true })
    }

    default:
      return error('Acción desconocida.')
  }
})

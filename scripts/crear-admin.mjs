// Crea el PRIMER administrador (el dueño). Después, las demás cuentas se crean desde la app.
// Uso: node scripts/crear-admin.mjs "Gabriel" gabriel@ejemplo.com
//      (pide la contraseña sin mostrarla; mínimo 10 caracteres)
import { createInterface } from 'node:readline'
import { cabeceras, variablesServidor } from './entorno.mjs'

const [nombre, email] = process.argv.slice(2)
if (!nombre || !email) {
  console.error('Uso: node scripts/crear-admin.mjs "Nombre" email@ejemplo.com')
  process.exit(1)
}

function preguntarOculto(pregunta) {
  return new Promise((resolver) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    rl._writeToOutput = (s) => rl.output.write(s.includes(pregunta) ? s : '')
    rl.question(pregunta, (r) => {
      rl.close()
      process.stdout.write('\n')
      resolver(r)
    })
  })
}

const clave =
  process.env.CLAVE_ADMIN ?? (await preguntarOculto('Contraseña (mínimo 10 caracteres): '))
if (clave.length < 10) {
  console.error('La contraseña tiene que tener al menos 10 caracteres.')
  process.exit(1)
}

const { url, clave: claveServicio } = variablesServidor()
const res = await fetch(`${url}/auth/v1/admin/users`, {
  method: 'POST',
  headers: cabeceras(claveServicio),
  body: JSON.stringify({
    email: email.trim().toLowerCase(),
    password: clave,
    email_confirm: true,
    user_metadata: { nombre },
    app_metadata: { rol: 'admin' },
  }),
})
const json = await res.json()
if (!res.ok) {
  console.error('No se pudo crear:', json.msg ?? json.message ?? JSON.stringify(json))
  process.exit(1)
}
console.log(`✓ Administrador creado: ${nombre} <${email}> (id ${json.id})`)

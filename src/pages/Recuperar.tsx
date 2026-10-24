import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { z } from 'zod'
import { Boton } from '../components/ui/Boton'
import { Campo } from '../components/ui/Campo'
import { MensajeError } from '../components/ui/Estados'
import { mensajeDeError } from '../lib/errores'
import { supabase } from '../lib/supabase'
import { PantallaAcceso } from './Ingresar'

const esquema = z.object({ email: z.email('Escribí un email válido') })

export function Recuperar() {
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<z.infer<typeof esquema>>({
    resolver: zodResolver(esquema),
  })

  const enviar = handleSubmit(async ({ email }) => {
    setError(null)
    try {
      const { error: e } = await supabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/nueva-clave`,
      })
      if (e && e.status !== 429) throw e
      // Mismo mensaje exista o no el email: no revelamos qué cuentas hay.
      setEnviado(true)
    } catch (e) {
      setError(mensajeDeError(e))
    }
  })

  return (
    <PantallaAcceso titulo="Recuperar la contraseña">
      {enviado ? (
        <div className="flex flex-col gap-4 text-center">
          <p>
            Si el email está registrado, te llega un link para elegir una contraseña nueva. Revisá
            también la carpeta de spam.
          </p>
          <Link to="/ingresar" className="font-semibold underline underline-offset-4">
            Volver a ingresar
          </Link>
        </div>
      ) : (
        <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
          {error && <MensajeError>{error}</MensajeError>}
          <Campo
            etiqueta="Email"
            type="email"
            autoComplete="username"
            error={formState.errors.email?.message}
            {...register('email')}
          />
          <Boton type="submit" cargando={formState.isSubmitting}>
            Mandarme el link
          </Boton>
          <Link
            to="/ingresar"
            className="py-2 text-center text-sm text-suave underline-offset-4 hover:underline"
          >
            Volver a ingresar
          </Link>
        </form>
      )}
    </PantallaAcceso>
  )
}

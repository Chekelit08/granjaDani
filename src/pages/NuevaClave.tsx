import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router'
import { z } from 'zod'
import { Boton } from '../components/ui/Boton'
import { Campo } from '../components/ui/Campo'
import { Cargando, MensajeError } from '../components/ui/Estados'
import { mensajeDeError } from '../lib/errores'
import { supabase } from '../lib/supabase'
import { esquemaClave } from '../lib/validacion'
import { useSesion } from '../sesion/Sesion'
import { PantallaAcceso } from './Ingresar'

const esquema = z
  .object({ clave: esquemaClave, repetir: z.string() })
  .refine((d) => d.clave === d.repetir, {
    message: 'Las dos contraseñas no son iguales',
    path: ['repetir'],
  })

export function NuevaClave() {
  const { cargando, sesion, perfil, recargarPerfil } = useSesion()
  const navegar = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<z.infer<typeof esquema>>({
    resolver: zodResolver(esquema),
  })

  if (cargando) return <Cargando />
  if (!sesion) return <Navigate to="/ingresar" replace />

  const guardar = handleSubmit(async ({ clave }) => {
    setError(null)
    try {
      const { error: e } = await supabase().auth.updateUser({ password: clave })
      if (e) throw e
      const { error: e2 } = await supabase().rpc('marcar_clave_cambiada')
      if (e2) throw e2
      await recargarPerfil()
      navegar('/', { replace: true })
    } catch (e) {
      const mensaje = (e as { message?: string }).message ?? ''
      setError(
        /different from the old/i.test(mensaje)
          ? 'La contraseña nueva tiene que ser distinta de la anterior.'
          : mensajeDeError(e),
      )
    }
  })

  return (
    <PantallaAcceso
      titulo={
        perfil?.debe_cambiar_clave
          ? `Hola ${perfil.nombre}: elegí tu contraseña`
          : 'Elegí una contraseña nueva'
      }
    >
      <form onSubmit={guardar} noValidate className="flex flex-col gap-4">
        {error && <MensajeError>{error}</MensajeError>}
        <Campo
          etiqueta="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          ayuda="Al menos 10 caracteres. Puede ser una frase."
          error={formState.errors.clave?.message}
          {...register('clave')}
        />
        <Campo
          etiqueta="Repetí la contraseña"
          type="password"
          autoComplete="new-password"
          error={formState.errors.repetir?.message}
          {...register('repetir')}
        />
        <Boton type="submit" cargando={formState.isSubmitting}>
          Guardar contraseña
        </Boton>
      </form>
    </PantallaAcceso>
  )
}

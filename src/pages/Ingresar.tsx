import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import marca from '../assets/marca.svg'
import { Boton } from '../components/ui/Boton'
import { Campo } from '../components/ui/Campo'
import { MensajeError } from '../components/ui/Estados'
import { esErrorDeRed, MENSAJE_SIN_INTERNET } from '../lib/errores'
import { supabase } from '../lib/supabase'
import { emailDeUsuario } from '../lib/usuario'
import { useSesion } from '../sesion/Sesion'

const esquema = z.object({
  email: z.string().trim().min(1, 'Escribí tu usuario (por ejemplo, mostrador) o tu email'),
  clave: z.string().min(1, 'Escribí tu contraseña'),
})
type Datos = z.infer<typeof esquema>

/** Pantalla partida: la marca a la izquierda (arriba en el celular) y el formulario. */
export function PantallaAcceso({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="relative flex flex-col justify-between overflow-hidden bg-marca px-6 py-8 text-sobre-marca sm:px-10 lg:py-12">
        <div
          aria-hidden="true"
          className="absolute -right-24 -bottom-24 size-80 rounded-full bg-acento/20 lg:size-[28rem]"
        />
        <div className="relative flex items-center gap-3">
          <img src={marca} alt="" className="w-11 animate-pop" />
          <span className="text-xl font-extrabold tracking-tight">Granja Dani</span>
        </div>
        <div className="relative mt-8 hidden max-w-sm lg:block">
          <p className="text-4xl leading-tight font-extrabold tracking-tight">
            La planilla del día, sin papel.
          </p>
          <p className="mt-3 text-sobre-marca/75">
            Kilos, pesos, efectivo y Mercado Pago de cada producto, al instante.
          </p>
        </div>
        <p className="relative mt-6 hidden text-sm text-sobre-marca/60 lg:block">
          Pollería · Granja
        </p>
      </div>
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-extrabold tracking-tight">{titulo}</h1>
          <p className="mt-1 mb-6 text-sm text-suave">Granja Dani · Caja y planilla del día</p>
          <div className="animate-pagina rounded-tarjeta border border-borde bg-superficie p-6 shadow-tarjeta">
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}

export function Ingresar() {
  const { sesion, perfil, aviso } = useSesion()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<Datos>({ resolver: zodResolver(esquema) })

  if (sesion && perfil) {
    const desde = (ubicacion.state as { desde?: string } | null)?.desde ?? '/'
    return <Navigate to={desde} replace />
  }

  const ingresar = handleSubmit(async ({ email, clave }) => {
    setError(null)
    try {
      const { error: e } = await supabase().auth.signInWithPassword({
        email: emailDeUsuario(email),
        password: clave,
      })
      if (e) {
        setError(
          esErrorDeRed(e) ? MENSAJE_SIN_INTERNET : 'El usuario o la contraseña no coinciden.',
        )
        return
      }
      navegar('/', { replace: true })
    } catch (e) {
      setError(
        esErrorDeRed(e) ? MENSAJE_SIN_INTERNET : 'No pudimos iniciar sesión. Probá de nuevo.',
      )
    }
  })

  return (
    <PantallaAcceso titulo="Ingresá a tu caja">
      <form onSubmit={ingresar} noValidate className="flex flex-col gap-4">
        {aviso && <p className="rounded-xl bg-hundida px-4 py-3 text-sm">{aviso}</p>}
        {error && <MensajeError>{error}</MensajeError>}
        <Campo
          etiqueta="Usuario o email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          error={formState.errors.email?.message}
          {...register('email')}
        />
        <Campo
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          error={formState.errors.clave?.message}
          {...register('clave')}
        />
        <Boton
          type="submit"
          tamano="grande"
          cargando={formState.isSubmitting}
          className="mt-2 w-full"
        >
          Ingresar
        </Boton>
        <Link
          to="/recuperar"
          className="py-2 text-center text-sm text-suave underline-offset-4 hover:underline"
        >
          Me olvidé la contraseña
        </Link>
      </form>
    </PantallaAcceso>
  )
}
